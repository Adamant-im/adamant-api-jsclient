import axios, {AxiosError} from 'axios';
import semver from 'semver';
import {HEALTH_CHECK_TIMEOUT} from './constants';
import {Logger} from './logger';
import {parseRetryAfterMs} from './rateLimit';
import {unixTimestamp} from './time';
import {parseUrl} from './url';

import {GetNodeStatusResponseDto} from '../api/generated';
import {AdamantApiResult, getRandomIntInclusive} from './validator';
import {WebSocketClient, WsOptions} from './wsClient';

export interface NodeManagerOptions {
  nodes: string[];
  timeout?: number;
  socket?: WebSocketClient;
  checkHealthAtStartup?: boolean;
  /** Minimum supported ADAMANT Node version, compared inclusively. */
  minVersion?: string;
}

export interface ActiveNode {
  node: string;
  ping: number;
  baseURL: string;
  ip?: string;
  isHttps: boolean;
  height: number;
  heightEpsilon: number;
  socketSupport: boolean;
  wsPort: number;
  version?: string;
  outOfSync?: boolean;
}

const CHECK_NODES_INTERVAL = 60 * 5 * 1000; // Update active nodes every 5 minutes
const STARTUP_RETRY_DELAYS_MS = [5_000, 10_000, 30_000, 60_000] as const;
const HEIGHT_EPSILON = 5; // Used to group nodes by height and choose synced
const MAX_SYNCING_FALLBACK_HEIGHT_LAG = HEIGHT_EPSILON * 5; // Max lag (25 blocks) for syncing fallback
const MAX_SYNCING_FALLBACK_REFERENCE_AGE_MS = CHECK_NODES_INTERVAL * 2; // Max age (10 min) of reference height
const MAX_NODE_RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // Cap per-node 429 cooldown at 60s
const DEFAULT_STATUS_RATE_LIMIT_COOLDOWN_MS = 5 * 1000;

interface ValidNodeStatusPayload {
  success: true;
  network: {height: number};
  version: {version: string};
  wsClient: {enabled: boolean; port?: number};
  loader?: {loaded?: boolean; syncing?: boolean} | null;
}

const isValidNodeStatusPayload = (
  response: unknown,
): response is ValidNodeStatusPayload => {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const record = response as Record<string, unknown>;
  const network = record.network as Record<string, unknown> | null | undefined;
  const version = record.version as Record<string, unknown> | null | undefined;
  const wsClient = record.wsClient as
    Record<string, unknown> | null | undefined;

  if (
    !network ||
    typeof network !== 'object' ||
    typeof network.height !== 'number' ||
    !Number.isFinite(network.height)
  ) {
    return false;
  }

  if (
    !version ||
    typeof version !== 'object' ||
    typeof version.version !== 'string'
  ) {
    return false;
  }

  if (
    !wsClient ||
    typeof wsClient !== 'object' ||
    typeof wsClient.enabled !== 'boolean'
  ) {
    return false;
  }

  if (
    wsClient.enabled &&
    (typeof wsClient.port !== 'number' || !Number.isFinite(wsClient.port))
  ) {
    return false;
  }

  return true;
};

const formatVersionSuffix = (version: string | undefined) =>
  version ? ` (${version.startsWith('v') ? version : `v${version}`})` : '';

const hasMinVersion = (version: string | undefined, minVersion?: string) => {
  if (!minVersion) {
    return true;
  }

  const coercedVersion = semver.coerce(version);
  const coercedMinVersion = semver.coerce(minVersion);

  return Boolean(
    coercedVersion &&
    coercedMinVersion &&
    semver.gte(coercedVersion, coercedMinVersion),
  );
};

type NotReadyReason = 'loading' | 'syncing' | 'loading-and-syncing';

interface NotReadyCounts {
  loading: number;
  syncing: number;
  loadingAndSyncing: number;
}

const emptyNotReady = (): NotReadyCounts => ({
  loading: 0,
  syncing: 0,
  loadingAndSyncing: 0,
});

const notReadyTotal = (counts: NotReadyCounts) =>
  counts.loading + counts.syncing + counts.loadingAndSyncing;

/**
 * A node can serve queries after it has finished loading and while it is not
 * syncing. Status payloads without `loader` stay eligible: nodes older than
 * v0.9.0 do not send that object.
 */
const classifyLoader = (
  loader: {loaded?: boolean; syncing?: boolean} | null | undefined,
): 'ready' | NotReadyReason => {
  if (!loader || typeof loader !== 'object') {
    return 'ready';
  }

  const loading = loader.loaded === false;
  const syncing = loader.syncing === true;

  if (loading && syncing) {
    return 'loading-and-syncing';
  }

  if (syncing) {
    return 'syncing';
  }

  if (loading) {
    return 'loading';
  }

  return 'ready';
};

const notReadyMessage = (node: string, reason: NotReadyReason) => {
  switch (reason) {
    case 'syncing':
      return `[ADAMANT js-api] Health check: Node ${node} is still syncing`;
    case 'loading':
      return `[ADAMANT js-api] Health check: Node ${node} is not loaded`;
    case 'loading-and-syncing':
      return `[ADAMANT js-api] Health check: Node ${node} is not loaded and is still syncing`;
  }
};

const notReadyFragments = (counts: NotReadyCounts) => {
  const fragments: string[] = [];

  if (counts.loading) {
    fragments.push(
      `${counts.loading} ${counts.loading === 1 ? 'node is' : 'nodes are'} not loaded`,
    );
  }

  if (counts.syncing) {
    fragments.push(
      `${counts.syncing} ${counts.syncing === 1 ? 'node is' : 'nodes are'} still syncing`,
    );
  }

  if (counts.loadingAndSyncing) {
    fragments.push(
      `${counts.loadingAndSyncing} ${counts.loadingAndSyncing === 1 ? 'node is' : 'nodes are'} not loaded and still syncing`,
    );
  }

  return fragments;
};

/** Selects healthy, synchronized nodes and coordinates socket reconnection. */
export class NodeManager {
  options: NodeManagerOptions;

  public node: string;
  public socket?: WebSocketClient;

  protected logger: Logger;
  protected hasCompatibleNode = true;

  private onReadyCallback?: () => void;

  private initialized = false;
  private startupRetryTimer?: ReturnType<typeof setTimeout>;
  private startupRetryAttempt = 0;
  private updateNodesPromise?: Promise<void>;
  private pendingForcedUpdate = false;
  private pendingFailedNode?: string;
  /** Per-node HTTP 429 cooldown expiration timestamps (epoch ms). */
  private readonly rateLimitedUntil = new Map<string, number>();
  /** Compatible nodes from the last successful `chooseNode()` call (with `outOfSync` set). */
  private lastActiveNodes: ActiveNode[] = [];
  /** Highest synced block height seen in the latest successful `chooseNode()` call. */
  private lastKnownSyncedHeight?: number;
  /** Timestamp (epoch ms) when `lastKnownSyncedHeight` was recorded. */
  private lastKnownSyncedHeightAt?: number;
  /** Loaded-but-syncing nodes from the latest `checkNodes()` call, used only as an initialized fallback. */
  private syncingFallbackNodes: ActiveNode[] = [];
  /** Count of nodes that returned HTTP 429 on `/api/node/status` during the latest `checkNodes()` call. */
  private rateLimitedCount = 0;
  /** Counts from the latest `checkNodes()` call, consumed by the next `chooseNode()`. */
  private notReadyCounts: NotReadyCounts = emptyNotReady();

  /**
   * Whether the manager has completed initial readiness (either a usable node
   * was selected during startup health checks, or `checkHealthAtStartup` is
   * `false`).
   */
  public get isReady(): boolean {
    return this.initialized;
  }

  constructor(logger: Logger, options: NodeManagerOptions) {
    this.options = {
      timeout: HEALTH_CHECK_TIMEOUT,
      checkHealthAtStartup: true,
      ...options,
    };

    const {socket, nodes, checkHealthAtStartup} = this.options;

    this.logger = logger;
    this.socket = socket;

    this.node = nodes[0];

    if (checkHealthAtStartup) {
      this.updateNodesSafely();

      setInterval(() => this.updateNodesSafely(), CHECK_NODES_INTERVAL);
    } else {
      this.ready();
    }
  }

  /**
   * Runs `callback` once a usable node has been selected.
   *
   * With startup health checks enabled, a usable node has answered
   * `/api/node/status`, satisfies `minVersion`, and is neither still loading
   * nor syncing. The callback does not run when that check selects no such
   * node. A later health check runs it after one becomes available.
   *
   * With startup health checks disabled, selection is skipped and the callback
   * runs immediately. An already ready manager runs the callback immediately.
   */
  public onReady(callback: () => void) {
    if (this.initialized) {
      callback();
      return;
    }

    this.onReadyCallback = callback;
  }

  public initSocket(options: WebSocketClient | WsOptions) {
    if (options instanceof WebSocketClient) {
      this.socket = options;
    } else {
      this.socket = new WebSocketClient({logger: this.logger, ...options});
    }
  }

  private clearStartupRetry() {
    if (this.startupRetryTimer) {
      clearTimeout(this.startupRetryTimer);
      this.startupRetryTimer = undefined;
    }
    this.startupRetryAttempt = 0;
  }

  private scheduleStartupRetry() {
    if (
      !this.options.checkHealthAtStartup ||
      this.initialized ||
      this.startupRetryTimer
    ) {
      return;
    }

    const delayMs =
      STARTUP_RETRY_DELAYS_MS[
        Math.min(this.startupRetryAttempt, STARTUP_RETRY_DELAYS_MS.length - 1)
      ];
    this.startupRetryAttempt += 1;

    this.startupRetryTimer = setTimeout(() => {
      this.startupRetryTimer = undefined;
      this.updateNodesSafely();
    }, delayMs);
    this.startupRetryTimer.unref?.();
  }

  private ready() {
    this.clearStartupRetry();
    this.initialized = true;
    const callback = this.onReadyCallback;
    this.onReadyCallback = undefined;

    if (callback) {
      callback();
    }
  }

  private updateNodesSafely() {
    void this.updateNodes(true).catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[ADAMANT js-api] Health check: Unexpected error while updating nodes: ${message}`,
      );
      if (!this.initialized) {
        this.scheduleStartupRetry();
      }
    });
  }

  /**
   * Records a temporary HTTP 429 cooldown for `node` so health checks and
   * failovers prefer other synced nodes until the node's window resets.
   */
  protected markNodeRateLimited(node: string, cooldownMs: number) {
    if (cooldownMs <= 0) {
      return;
    }

    const boundedMs = Math.min(cooldownMs, MAX_NODE_RATE_LIMIT_COOLDOWN_MS);
    const expiresAt = Date.now() + boundedMs;
    const existing = this.rateLimitedUntil.get(node) ?? 0;

    if (expiresAt > existing) {
      this.rateLimitedUntil.set(node, expiresAt);
    }
  }

  /**
   * Switches to another already-verified synced, non-rate-limited node from the
   * latest health sweep without issuing new `/api/node/status` requests.
   */
  protected switchNodeFromCache(failedNode: string): boolean {
    const now = Date.now();
    const candidates = this.lastActiveNodes
      .filter(
        candidate =>
          candidate.node !== failedNode &&
          !candidate.outOfSync &&
          !this.isNodeRateLimited(candidate.node, now),
      )
      .sort((a, b) => a.ping - b.ping);

    if (!candidates.length) {
      return false;
    }

    const nextNode = candidates[0];
    this.node = nextNode.node;
    this.logger.log(
      `[ADAMANT js-api] Health check: Switched active node to cached synced node ${this.node}${formatVersionSuffix(nextNode.version)}.`,
    );
    return true;
  }

  private isNodeRateLimited(node: string, now: number) {
    const expiresAt = this.rateLimitedUntil.get(node);
    if (expiresAt === undefined) {
      return false;
    }

    if (expiresAt <= now) {
      this.rateLimitedUntil.delete(node);
      return false;
    }

    return true;
  }

  async updateNodes(isPlannedUpdate = false, failedNode?: string) {
    if (!isPlannedUpdate) {
      if (this.updateNodesPromise && !this.pendingForcedUpdate) {
        this.logger.warn(
          '[ADAMANT js-api] Health check: Forcing to update active nodes…',
        );
      }
      this.pendingForcedUpdate = true;
      if (failedNode) {
        this.pendingFailedNode = failedNode;
      }
    }

    if (this.updateNodesPromise) {
      return this.updateNodesPromise;
    }

    this.updateNodesPromise = this.doUpdateNodes(
      isPlannedUpdate,
      failedNode,
    ).finally(() => {
      this.updateNodesPromise = undefined;
      this.pendingForcedUpdate = false;
      this.pendingFailedNode = undefined;
    });

    return this.updateNodesPromise;
  }

  private async doUpdateNodes(isPlannedUpdate: boolean, failedNode?: string) {
    if (!isPlannedUpdate) {
      this.logger.warn(
        '[ADAMANT js-api] Health check: Forcing to update active nodes…',
      );
    }

    const activeNodes = await this.checkNodes();
    const forceChange = !isPlannedUpdate || this.pendingForcedUpdate;
    const nodeToAvoid = this.pendingFailedNode ?? failedNode;
    const selected = await this.chooseNode(
      activeNodes,
      forceChange,
      nodeToAvoid,
    );

    if (!this.initialized) {
      if (selected) {
        this.ready();
      } else {
        this.scheduleStartupRetry();
      }
    }
  }

  private selectSyncingFallback(
    syncingFallbackNodes: ActiveNode[],
    forceChangeActiveNode?: boolean,
    failedNode?: string,
  ): boolean {
    if (!this.initialized || !syncingFallbackNodes.length) {
      return false;
    }

    const now = Date.now();
    if (
      this.lastKnownSyncedHeight === undefined ||
      this.lastKnownSyncedHeightAt === undefined ||
      now - this.lastKnownSyncedHeightAt > MAX_SYNCING_FALLBACK_REFERENCE_AGE_MS
    ) {
      return false;
    }

    const {minVersion} = this.options;
    const minHeight =
      this.lastKnownSyncedHeight - MAX_SYNCING_FALLBACK_HEIGHT_LAG;
    const compatible = syncingFallbackNodes.filter(
      node =>
        hasMinVersion(node.version, minVersion) && node.height >= minHeight,
    );
    if (!compatible.length) {
      return false;
    }

    const nonRateLimited = compatible.filter(
      candidate => !this.isNodeRateLimited(candidate.node, now),
    );
    let pool = nonRateLimited.length ? nonRateLimited : compatible;

    const nodeToAvoid = failedNode ?? this.node;
    if (forceChangeActiveNode && nodeToAvoid) {
      const alternatives = pool.filter(
        candidate => candidate.node !== nodeToAvoid,
      );
      if (alternatives.length) {
        pool = alternatives;
      }
    }

    const [chosen] = [...pool].sort(
      (a, b) => b.height - a.height || a.ping - b.ping,
    );

    this.hasCompatibleNode = true;
    this.lastActiveNodes = [];
    this.node = chosen.node;
    this.logger.warn(
      `[ADAMANT js-api] Health check: No fully synced nodes available; falling back to loaded syncing node ${this.node}${formatVersionSuffix(chosen.version)}.`,
    );
    return true;
  }

  async chooseNode(
    activeNodes: ActiveNode[],
    forceChangeActiveNode?: boolean,
    failedNode?: string,
  ): Promise<boolean> {
    const {logger, socket} = this;
    const notReady = this.takeNotReadyCounts();
    const rateLimitedCount = this.takeRateLimitedCount();
    const syncingFallbackNodes = this.takeSyncingFallbackNodes();

    const respondingNodesCount = activeNodes.length;
    if (!respondingNodesCount) {
      if (
        this.selectSyncingFallback(
          syncingFallbackNodes,
          forceChangeActiveNode,
          failedNode,
        )
      ) {
        return true;
      }

      // There is no version evidence while every node is offline or not ready
      // to serve. Reset the compatibility flag so callers receive the actual
      // transport or loader failure.
      this.hasCompatibleNode = true;
      this.lastActiveNodes = [];
      const totalNodesCount = this.options.nodes.length;

      if (notReadyTotal(notReady) > 0 || rateLimitedCount > 0) {
        const unavailableCount = Math.max(
          0,
          totalNodesCount - notReadyTotal(notReady) - rateLimitedCount,
        );
        const details = [
          unavailableCount
            ? `${unavailableCount} ${unavailableCount === 1 ? 'node did' : 'nodes did'} not respond`
            : '',
          ...notReadyFragments(notReady),
          rateLimitedCount
            ? `${rateLimitedCount} ${rateLimitedCount === 1 ? 'node is' : 'nodes are'} rate-limited`
            : '',
        ].filter(detail => detail.length > 0);

        logger.error(
          `[ADAMANT js-api] Health check: No usable nodes available. ${details.join('. ')}.`,
        );
        return false;
      }

      logger.error(
        `[ADAMANT js-api] Health check: All of ${totalNodesCount} nodes are unavailable. Check internet connection and nodes list in config.`,
      );
      return false;
    }

    const {minVersion} = this.options;
    const compatibleNodes = activeNodes.filter(node =>
      hasMinVersion(node.version, minVersion),
    );
    const incompatibleVersionCount =
      respondingNodesCount - compatibleNodes.length;
    const coercedMinVersion = semver.coerce(minVersion);
    const minVersionLabel = minVersion
      ? `v${coercedMinVersion?.version ?? minVersion.replace(/^v/, '')}`
      : '';

    if (incompatibleVersionCount) {
      for (const node of activeNodes) {
        if (!compatibleNodes.includes(node)) {
          const parsedVersion = semver.coerce(node.version);
          const nodeVersion = parsedVersion
            ? `v${parsedVersion.version}`
            : (node.version ?? 'unknown');
          logger.warn(
            `[ADAMANT js-api] Health check: Node ${node.node} version ${nodeVersion} is below minimum required version ${minVersionLabel}`,
          );
        }
      }
    }

    const activeNodesCount = compatibleNodes.length;
    if (!activeNodesCount) {
      if (
        this.selectSyncingFallback(
          syncingFallbackNodes,
          forceChangeActiveNode,
          failedNode,
        )
      ) {
        return true;
      }

      this.hasCompatibleNode = false;
      this.lastActiveNodes = [];
      const unavailableCount = Math.max(
        0,
        this.options.nodes.length -
          respondingNodesCount -
          notReadyTotal(notReady) -
          rateLimitedCount,
      );
      const unavailableInfo = unavailableCount
        ? ` ${unavailableCount} ${unavailableCount === 1 ? 'node did' : 'nodes did'} not respond.`
        : '';
      const notReadyInfo = notReadyFragments(notReady)
        .map(fragment => ` ${fragment}.`)
        .join('');
      const rateLimitedInfo = rateLimitedCount
        ? ` ${rateLimitedCount} ${rateLimitedCount === 1 ? 'node is' : 'nodes are'} rate-limited.`
        : '';

      logger.error(
        `[ADAMANT js-api] Health check: No compatible nodes available.${unavailableInfo}${notReadyInfo}${rateLimitedInfo} ${incompatibleVersionCount} ${incompatibleVersionCount === 1 ? 'node is' : 'nodes are'} below minimum required version ${minVersionLabel}.`,
      );
      return false;
    }

    this.hasCompatibleNode = true;

    let outOfSyncCount = 0;
    const now = Date.now();
    const nodeToAvoid = failedNode ?? this.node;

    if (activeNodesCount === 1) {
      compatibleNodes[0].outOfSync = false;
      this.node = compatibleNodes[0].node;
    } else if (activeNodesCount === 2) {
      const [h0, h1] = compatibleNodes;

      // Mark node outOfSync if needed
      if (h0.heightEpsilon > h1.heightEpsilon) {
        compatibleNodes[0].outOfSync = false;
        compatibleNodes[1].outOfSync = true;
        outOfSyncCount += 1;
        this.node = h0.node;
      } else if (h0.heightEpsilon < h1.heightEpsilon) {
        compatibleNodes[0].outOfSync = true;
        compatibleNodes[1].outOfSync = false;
        outOfSyncCount += 1;
        this.node = h1.node;
      } else {
        compatibleNodes[0].outOfSync = false;
        compatibleNodes[1].outOfSync = false;
        const nonRateLimited = compatibleNodes.filter(
          candidate => !this.isNodeRateLimited(candidate.node, now),
        );
        const pool = nonRateLimited.length ? nonRateLimited : compatibleNodes;

        if (pool.length === 1) {
          this.node = pool[0].node;
        } else if (
          forceChangeActiveNode &&
          failedNode &&
          this.node !== failedNode &&
          pool.some(candidate => candidate.node === this.node)
        ) {
          // Another request already failed over away from `failedNode`.
        } else if (forceChangeActiveNode && nodeToAvoid === h0.node) {
          this.node = h1.node;
        } else if (forceChangeActiveNode && nodeToAvoid === h1.node) {
          this.node = h0.node;
        } else {
          this.node = h0.height > h1.height ? h0.node : h1.node;
        }
      }
    } else {
      // Removing lodash: const groups = _.groupBy(liveNodes, n => n.heightEpsilon);
      const groups = compatibleNodes.reduce(
        (grouped: {[heightEpsilon: number]: ActiveNode[]}, node) => {
          const {heightEpsilon} = node;

          if (!grouped[heightEpsilon]) {
            grouped[heightEpsilon] = [];
          }

          grouped[heightEpsilon].push(node);

          return grouped;
        },
        {},
      );

      let biggestGroup: ActiveNode[] = [];
      let biggestGroupSize = 0;

      for (const key in groups) {
        if (Object.prototype.hasOwnProperty.call(groups, key)) {
          const group = groups[key];

          if (groups[key].length > biggestGroupSize) {
            biggestGroup = group;
            biggestGroupSize = group.length;
          }
        }
      }

      // All the nodes from the biggestGroup list are considered to be in sync, all the others are not
      for (const node of compatibleNodes) {
        node.outOfSync = !biggestGroup.includes(node);
      }

      outOfSyncCount = compatibleNodes.length - biggestGroup.length;

      biggestGroup.sort((a, b) => a.ping - b.ping);

      const nonRateLimited = biggestGroup.filter(
        candidate => !this.isNodeRateLimited(candidate.node, now),
      );
      const pool = nonRateLimited.length ? nonRateLimited : biggestGroup;

      if (
        forceChangeActiveNode &&
        failedNode &&
        this.node !== failedNode &&
        pool.some(candidate => candidate.node === this.node)
      ) {
        // Another request already failed over away from `failedNode`.
      } else if (
        forceChangeActiveNode &&
        pool.length > 1 &&
        nodeToAvoid === pool[0].node
      ) {
        // Use random node from synced candidates other than `nodeToAvoid`
        const randomIndex = getRandomIntInclusive(1, pool.length - 1);
        this.node = pool[randomIndex].node;
      } else {
        // Use node with minimum ping among eligible synced nodes
        this.node = pool[0].node;
      }
    }

    this.lastActiveNodes = [...compatibleNodes];
    const syncedHeights = compatibleNodes
      .filter(node => !node.outOfSync)
      .map(node => node.height);
    if (syncedHeights.length) {
      this.lastKnownSyncedHeight = Math.max(...syncedHeights);
      this.lastKnownSyncedHeightAt = Date.now();
    }
    socket?.reviseConnection(compatibleNodes);

    const {nodes} = this.options;

    const unavailableCount = Math.max(
      0,
      nodes.length -
        respondingNodesCount -
        notReadyTotal(notReady) -
        rateLimitedCount,
    );
    const supportedCount = activeNodesCount - outOfSyncCount;
    const supportedNodeLabel = supportedCount === 1 ? 'node' : 'nodes';

    let nodesInfoString = '';

    if (unavailableCount) {
      nodesInfoString += `, ${unavailableCount} ${unavailableCount === 1 ? "node didn't" : "nodes didn't"} respond`;
    }

    if (incompatibleVersionCount) {
      nodesInfoString += `, ${incompatibleVersionCount} ${incompatibleVersionCount === 1 ? 'node is' : 'nodes are'} below minimum version ${minVersionLabel}`;
    }

    for (const fragment of notReadyFragments(notReady)) {
      nodesInfoString += `, ${fragment}`;
    }

    if (rateLimitedCount) {
      nodesInfoString += `, ${rateLimitedCount} ${rateLimitedCount === 1 ? 'node is' : 'nodes are'} rate-limited`;
    }

    if (outOfSyncCount) {
      nodesInfoString += `, ${outOfSyncCount} ${outOfSyncCount === 1 ? 'node is' : 'nodes are'} not synced`;
    }

    const activeNode = compatibleNodes.find(node => node.node === this.node);
    const version = formatVersionSuffix(activeNode?.version);

    this.logger.log(
      `[ADAMANT js-api] Health check: Found ${supportedCount} supported and synced ${supportedNodeLabel}${nodesInfoString}. Active node is ${this.node}${version}.`,
    );
    return true;
  }

  private takeNotReadyCounts() {
    const counts = this.notReadyCounts;
    this.notReadyCounts = emptyNotReady();
    return counts;
  }

  private takeRateLimitedCount() {
    const count = this.rateLimitedCount;
    this.rateLimitedCount = 0;
    return count;
  }

  private takeSyncingFallbackNodes() {
    const nodes = this.syncingFallbackNodes;
    this.syncingFallbackNodes = [];
    return nodes;
  }

  private recordNotReady(reason: NotReadyReason) {
    if (reason === 'loading') {
      this.notReadyCounts.loading += 1;
      return;
    }

    if (reason === 'syncing') {
      this.notReadyCounts.syncing += 1;
      return;
    }

    this.notReadyCounts.loadingAndSyncing += 1;
  }

  async checkNode(node: string) {
    try {
      const {timeout} = this.options;

      const response = await axios.get<
        AdamantApiResult<GetNodeStatusResponseDto>
      >(`${node}/api/node/status`, {
        timeout,
      });

      const data = response.data;
      if (!data || typeof data !== 'object') {
        return {success: false} as {success: false; rateLimited?: boolean};
      }

      return data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 429) {
        const retryAfterMs = parseRetryAfterMs(error.response.headers);
        this.markNodeRateLimited(
          node,
          retryAfterMs ?? DEFAULT_STATUS_RATE_LIMIT_COOLDOWN_MS,
        );
        return {success: false, rateLimited: true} as {
          success: false;
          rateLimited?: boolean;
        };
      }

      return {success: false} as {success: false; rateLimited?: boolean};
    }
  }

  async checkNodes() {
    const {nodes} = this.options;

    const activeNodes: ActiveNode[] = [];
    this.notReadyCounts = emptyNotReady();
    this.rateLimitedCount = 0;
    this.syncingFallbackNodes = [];

    for (const node of nodes) {
      const start = unixTimestamp();

      const response = await this.checkNode(node);

      const ping = unixTimestamp() - start;

      if (!response || typeof response !== 'object' || !response.success) {
        if (
          typeof response === 'object' &&
          response !== null &&
          'rateLimited' in response &&
          response.rateLimited
        ) {
          this.rateLimitedCount += 1;
          this.logger.log(
            `[ADAMANT js-api] Health check: Node ${node} rate-limited the status request (HTTP 429)`,
          );
          continue;
        }

        this.logger.log(
          `[ADAMANT js-api] Health check: Node ${node} hasn't returned its status`,
        );
        continue;
      }

      const readiness = classifyLoader(response.loader);
      if (readiness === 'loading' || readiness === 'loading-and-syncing') {
        this.recordNotReady(readiness);
        this.logger.log(notReadyMessage(node, readiness));
        continue;
      }

      if (!isValidNodeStatusPayload(response)) {
        this.logger.warn(
          `[ADAMANT js-api] Health check: Node ${node} returned a malformed status payload`,
        );
        continue;
      }

      const {version, wsClient, network} = response;

      const socketSupport = wsClient.enabled;
      const wsPort =
        typeof wsClient.port === 'number' && Number.isFinite(wsClient.port)
          ? wsClient.port
          : 0;

      const {height} = network;
      const candidate: ActiveNode = {
        ...(await parseUrl(node)),
        node,
        ping,
        height,
        heightEpsilon: Math.round(height / HEIGHT_EPSILON),
        socketSupport,
        wsPort,
        version: version.version,
      };

      if (readiness === 'syncing') {
        this.recordNotReady(readiness);
        this.logger.log(notReadyMessage(node, readiness));
        this.syncingFallbackNodes.push(candidate);
        continue;
      }

      activeNodes.push(candidate);
    }

    return activeNodes;
  }
}
