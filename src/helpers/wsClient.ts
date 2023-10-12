import {io, type Socket} from 'socket.io-client';

import type {ActiveNode} from './healthCheck';
import {Logger} from './logger';
import {getRandomIntInclusive} from './validator';
import {TransactionType} from './constants';
import {
  ChatMessageTransaction,
  TokenTransferTransaction,
} from '../api/generated';

export type WsType = 'ws' | 'wss';

export type OnNewTransactionCallback = (
  transaction: ChatMessageTransaction | TokenTransferTransaction
) => void;

export interface WsOptions {
  /**
   * ADM address to subscribe to notifications
   */
  admAddress: `U${string}`;

  /**
   * Websocket type: `'wss'` or `'ws'`. `'wss'` is recommended.
   */
  wsType: WsType;

  /**
   * Must connect to node with minimum ping. Not recommended. Default is `false`.
   */
  useFastest?: boolean;

  onNewMessage: OnNewTransactionCallback;
}

export class WebSocketClient {
  /**
   * Web socket client options.
   */
  public options: WsOptions;

  /**
   * Current socket connection
   */
  private connection?: Socket;

  /**
   * List of nodes that are active, synced and support socket.
   */
  private nodes: ActiveNode[];

  private logger: Logger;
  private onNewMessageCallback: OnNewTransactionCallback;

  constructor(logger: Logger, options: WsOptions) {
    this.logger = logger;
    this.options = options;

    this.nodes = [];
    this.onNewMessageCallback = options.onNewMessage;
  }

  /**
   * Filters nodes that support websocket and connects to one of them.
   *
   * @param nodes Sorted by ping array of active nodes
   */
  reviseConnection(nodes: ActiveNode[]) {
    if (this.connection?.connected) {
      return;
    }

    const {wsType} = this.options;

    this.nodes = nodes.filter(
      node =>
        node.socketSupport &&
        !node.outOfSync &&
        // Remove nodes without IP if 'ws' connection type
        (wsType !== 'ws' || !node.isHttps || node.ip)
    );

    this.setConnection();
  }

  /**
   * Chooses node and sets up connection.
   */
  setConnection() {
    const {logger} = this;

    const supportedCount = this.nodes.length;
    if (!supportedCount) {
      logger.warn('[Socket] No supported socket nodes at the moment.');
      return;
    }

    const node = this.chooseNode();
    logger.log(
      `[Socket] Supported nodes: ${supportedCount}. Connecting to ${node}...`
    );
    const connection = io(node, {
      reconnection: false,
      timeout: 5000,
    });

    connection.on('connect', () => {
      const {admAddress} = this.options;

      connection.emit('address', admAddress);
      logger.info(
        `[Socket] Connected to ${node} and subscribed to incoming transactions for ${admAddress}`
      );
    });

    connection.on('disconnect', reason =>
      logger.warn(`[Socket] Disconnected. Reason: ${reason}`)
    );

    connection.on('connect_error', error =>
      logger.warn(`[Socket] Connection error: ${error}`)
    );

    connection.on('newTrans', transaction => {
      if (transaction.recipientId !== this.options.admAddress) {
        return;
      }

      if (
        ![TransactionType.CHAT_MESSAGE, TransactionType.SEND].includes(
          transaction.type
        )
      ) {
        return;
      }

      this.onNewMessageCallback(transaction);
    });

    this.connection = connection;
  }

  /**
   * Chooses fastest or random node based on {@link WsOptions.useFastest} option
   *
   * @returns WebSocket url
   */
  chooseNode(): string {
    const {wsType, useFastest} = this.options;

    const node = useFastest ? this.fastestNode() : this.randomNode();

    let baseURL: string;

    if (wsType === 'ws') {
      const host = node.ip ? node.ip : node.baseURL;

      baseURL = `${host}:${node.wsPort}`;
    } else {
      baseURL = node.baseURL; // no port if wss
    }

    return `${wsType}://${baseURL}`;
  }

  fastestNode() {
    return this.nodes[0]; // They are already sorted by ping
  }

  randomNode() {
    const randomIndex = getRandomIntInclusive(0, this.nodes.length - 1);
    return this.nodes[randomIndex];
  }
}
