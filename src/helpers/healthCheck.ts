import axios from 'axios';
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
  outOfSync?: boolean;
}

const CHECK_NODES_INTERVAL = 60 * 5 * 1000; // Update active nodes every 5 minutes
const HEIGHT_EPSILON = 5; // Used to group nodes by height and choose synced

export class NodeManager {
  options: NodeManagerOptions;

  public node: string;
  public socket?: WebSocketClient;

  protected logger: Logger;

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
      this.updateNodes(true);

      setInterval(() => this.updateNodes(true), CHECK_NODES_INTERVAL);
    } else {
      this.ready();
    }
  }

  public onReady(callback: () => void) {
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

  async updateNodes(isPlannedUpdate = false) {
    if (this.isCheckingNodes) {
      return;
    }

    this.isCheckingNodes = true;

    if (!isPlannedUpdate) {
      this.logger.warn(
        '[ADAMANT js-api] Health check: Forcing to update active nodes…'
      );
    }

    const activeNodes = await this.checkNodes();

    await this.chooseNode(activeNodes, !isPlannedUpdate);

    if (!this.initialized) {
      this.ready();
    }

    this.isCheckingNodes = false;
  }

  async chooseNode(activeNodes: ActiveNode[], forceChangeActiveNode?: boolean) {
    const {logger, socket} = this;

    const {length: activeNodesCount} = activeNodes;
    if (!activeNodesCount) {
      logger.error(
        `[ADAMANT js-api] Health check: All of ${activeNodesCount} nodes are unavailable. Check internet connection and nodes list in config.`
      );
      return;
    }

    let outOfSyncCount = 0;

    if (activeNodesCount === 1) {
      this.node = activeNodes[0].node;
    } else if (activeNodesCount === 2) {
      const [h0, h1] = activeNodes;

      this.node = h0.height > h1.height ? h0.node : h1.node;

      // Mark node outOfSync if needed
      if (h0.heightEpsilon > h1.heightEpsilon) {
        activeNodes[1].outOfSync = true;
        outOfSyncCount += 1;
      } else if (h0.heightEpsilon < h1.heightEpsilon) {
        activeNodes[0].outOfSync = true;
        outOfSyncCount += 1;
      }
    } else {
      // Removing lodash: const groups = _.groupBy(liveNodes, n => n.heightEpsilon);
      const groups = activeNodes.reduce(
        (grouped: {[heightEpsilon: number]: ActiveNode[]}, node) => {
          const {heightEpsilon} = node;

          if (!grouped[heightEpsilon]) {
            grouped[heightEpsilon] = [];
          }

          grouped[heightEpsilon].push(node);

          return grouped;
        },
        {}
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
      for (const node of activeNodes) {
        node.outOfSync = !biggestGroup.includes(node);
      }

      outOfSyncCount = activeNodes.length - biggestGroup.length;

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

    socket?.reviseConnection(activeNodes);

    const {nodes} = this.options;

    const unavailableCount = nodes.length - activeNodesCount;
    const supportedCount = activeNodesCount - outOfSyncCount;

    let nodesInfoString = '';

    if (unavailableCount) {
      nodesInfoString += `, ${unavailableCount} nodes didn't respond`;
    }

    if (outOfSyncCount) {
      nodesInfoString += `, ${outOfSyncCount} nodes are not synced`;
    }

    this.logger.log(
      `[ADAMANT js-api] Health check: Found ${supportedCount} supported and synced nodes${nodesInfoString}. Active node is ${this.node}.`
    );
  }

  async getNodeStatus(node: string) {
    try {
      const {timeout} = this.options;

      const response = await axios.get<
        AdamantApiResult<GetNodeStatusResponseDto>
      >(`${node}/api/node/status`, {
        timeout,
      });

      return response.data;
    } catch (error) {
      return {success: false} as {success: false};
    }
  }

  async checkNodes() {
    const {nodes} = this.options;

    const activeNodes: ActiveNode[] = [];

    for (const node of nodes) {
      const start = unixTimestamp();

      const response = await this.getNodeStatus(node);

      const ping = unixTimestamp() - start;

      if (!response.success) {
        this.logger.log(
          `[ADAMANT js-api] Health check: Node ${node} haven't returned its status`
        );
        continue;
      }

      const {wsClient, network} = response;

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
      });
    }

    return activeNodes;
  }
}
