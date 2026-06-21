import axios from 'axios';
import semver from 'semver';
import {HEALTH_CHECK_TIMEOUT} from './constants';
import {Logger} from './logger';
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
const HEIGHT_EPSILON = 5; // Used to group nodes by height and choose synced

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

/** Selects healthy, synchronized nodes and coordinates socket reconnection. */
export class NodeManager {
  options: NodeManagerOptions;

  public node: string;
  public socket?: WebSocketClient;

  protected logger: Logger;
  protected hasCompatibleNode = true;

  private onReadyCallback?: () => void;

  private initialized = false;
  private isCheckingNodes = false;

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

  private ready() {
    if (this.onReadyCallback) {
      this.onReadyCallback();
    }

    this.initialized = true;
  }

  private updateNodesSafely() {
    void this.updateNodes(true).catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[ADAMANT js-api] Health check: Unexpected error while updating nodes: ${message}`,
      );
    });
  }

  async updateNodes(isPlannedUpdate = false) {
    if (this.isCheckingNodes) {
      return;
    }

    this.isCheckingNodes = true;

    try {
      if (!isPlannedUpdate) {
        this.logger.warn(
          '[ADAMANT js-api] Health check: Forcing to update active nodes…',
        );
      }

      const activeNodes = await this.checkNodes();

      await this.chooseNode(activeNodes, !isPlannedUpdate);

      if (!this.initialized) {
        this.ready();
      }
    } finally {
      this.isCheckingNodes = false;
    }
  }

  async chooseNode(activeNodes: ActiveNode[], forceChangeActiveNode?: boolean) {
    const {logger, socket} = this;

    const respondingNodesCount = activeNodes.length;
    if (!respondingNodesCount) {
      // There is no version evidence while every node is offline. Reset the
      // compatibility flag so callers receive the actual transport failure.
      this.hasCompatibleNode = true;
      const totalNodesCount = this.options.nodes.length;

      logger.error(
        `[ADAMANT js-api] Health check: All of ${totalNodesCount} nodes are unavailable. Check internet connection and nodes list in config.`,
      );
      return;
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
      this.hasCompatibleNode = false;
      const unavailableCount = this.options.nodes.length - respondingNodesCount;
      const unavailableInfo = unavailableCount
        ? ` ${unavailableCount} ${unavailableCount === 1 ? 'node did' : 'nodes did'} not respond.`
        : '';

      logger.error(
        `[ADAMANT js-api] Health check: No compatible nodes available.${unavailableInfo} ${incompatibleVersionCount} ${incompatibleVersionCount === 1 ? 'node is' : 'nodes are'} below minimum required version ${minVersionLabel}.`,
      );
      return;
    }

    this.hasCompatibleNode = true;

    let outOfSyncCount = 0;

    if (activeNodesCount === 1) {
      this.node = compatibleNodes[0].node;
    } else if (activeNodesCount === 2) {
      const [h0, h1] = compatibleNodes;

      this.node = h0.height > h1.height ? h0.node : h1.node;

      // Mark node outOfSync if needed
      if (h0.heightEpsilon > h1.heightEpsilon) {
        compatibleNodes[1].outOfSync = true;
        outOfSyncCount += 1;
      } else if (h0.heightEpsilon < h1.heightEpsilon) {
        compatibleNodes[0].outOfSync = true;
        outOfSyncCount += 1;
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

      if (
        forceChangeActiveNode &&
        biggestGroup.length > 1 &&
        this.node === biggestGroup[0].node
      ) {
        // Use random node from which are synced
        const randomIndex = getRandomIntInclusive(1, biggestGroup.length - 1);
        this.node = biggestGroup[randomIndex].node;
      } else {
        // Use node with minimum ping among synced
        this.node = biggestGroup[0].node;
      }
    }

    socket?.reviseConnection(compatibleNodes);

    const {nodes} = this.options;

    const unavailableCount = nodes.length - respondingNodesCount;
    const supportedCount = activeNodesCount - outOfSyncCount;
    const supportedNodeLabel = supportedCount === 1 ? 'node' : 'nodes';

    let nodesInfoString = '';

    if (unavailableCount) {
      nodesInfoString += `, ${unavailableCount} ${unavailableCount === 1 ? "node didn't" : "nodes didn't"} respond`;
    }

    if (incompatibleVersionCount) {
      nodesInfoString += `, ${incompatibleVersionCount} ${incompatibleVersionCount === 1 ? 'node is' : 'nodes are'} below minimum version ${minVersionLabel}`;
    }

    if (outOfSyncCount) {
      nodesInfoString += `, ${outOfSyncCount} ${outOfSyncCount === 1 ? 'node is' : 'nodes are'} not synced`;
    }

    const activeNode = compatibleNodes.find(node => node.node === this.node);
    const version = activeNode?.version
      ? ` (${activeNode.version.startsWith('v') ? activeNode.version : `v${activeNode.version}`})`
      : '';

    this.logger.log(
      `[ADAMANT js-api] Health check: Found ${supportedCount} supported and synced ${supportedNodeLabel}${nodesInfoString}. Active node is ${this.node}${version}.`,
    );
  }

  async checkNode(node: string) {
    try {
      const {timeout} = this.options;

      const response = await axios.get<
        AdamantApiResult<GetNodeStatusResponseDto>
      >(`${node}/api/node/status`, {
        timeout,
      });

      return response.data;
    } catch {
      return {success: false} as {success: false};
    }
  }

  async checkNodes() {
    const {nodes} = this.options;

    const activeNodes: ActiveNode[] = [];

    for (const node of nodes) {
      const start = unixTimestamp();

      const response = await this.checkNode(node);

      const ping = unixTimestamp() - start;

      if (!response.success) {
        this.logger.log(
          `[ADAMANT js-api] Health check: Node ${node} hasn't returned its status`,
        );
        continue;
      }

      const {version, wsClient, network} = response;

      const socketSupport = wsClient.enabled;
      const wsPort = wsClient.port;

      const {height} = network;

      activeNodes.push({
        ...(await parseUrl(node)),
        node,
        ping,
        height,
        heightEpsilon: Math.round(height / HEIGHT_EPSILON),
        socketSupport,
        wsPort,
        version: version.version,
      });
    }

    return activeNodes;
  }
}
