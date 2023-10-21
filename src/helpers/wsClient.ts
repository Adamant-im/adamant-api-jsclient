import {io, type Socket} from 'socket.io-client';

import type {ActiveNode} from './healthCheck';
import {Logger} from './logger';
import {getRandomIntInclusive} from './validator';
import {TransactionType} from './constants';
import type {
  AnyTransaction,
  ChatMessageTransaction,
  KVSTransaction,
  RegisterDelegateTransaction,
  TokenTransferTransaction,
  VoteForDelegateTransaction,
} from '../api/generated';
import type {AdamantAddress} from '../api';
import {BasicTransaction} from './transactions/hash';

export type WsType = 'ws' | 'wss';

export interface WsOptions {
  /**
   * ADM address to subscribe to notifications
   */
  admAddress: AdamantAddress;

  /**
   * Websocket type: `'wss'` or `'ws'`. `'wss'` is recommended.
   */
  wsType?: WsType;

  /**
   * Must connect to node with minimum ping. Not recommended. Default is `false`.
   */
  useFastest?: boolean;

  logger?: Logger;
}

type ErrorHandler = (error: unknown) => void;

type TransactionMap = {
  [TransactionType.SEND]: TokenTransferTransaction;
  [TransactionType.DELEGATE]: RegisterDelegateTransaction;
  [TransactionType.VOTE]: VoteForDelegateTransaction;
  [TransactionType.CHAT_MESSAGE]: ChatMessageTransaction;
  [TransactionType.STATE]: KVSTransaction;
};

type EventType = keyof TransactionMap;

type TransactionHandler<T extends BasicTransaction> = (transaction: T) => void;

type SingleTransactionHandler =
  | TransactionHandler<TokenTransferTransaction>
  | TransactionHandler<RegisterDelegateTransaction>
  | TransactionHandler<VoteForDelegateTransaction>
  | TransactionHandler<ChatMessageTransaction>
  | TransactionHandler<KVSTransaction>;

type AnyTransactionHandler = TransactionHandler<AnyTransaction>;

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

  private errorHandler: ErrorHandler = () => void 0;
  private eventHandlers: {
    [T in EventType]: ((transaction: TransactionMap[T]) => void)[];
  } = {
    [TransactionType.SEND]: [],
    [TransactionType.DELEGATE]: [],
    [TransactionType.VOTE]: [],
    [TransactionType.CHAT_MESSAGE]: [],
    [TransactionType.STATE]: [],
  };

  constructor(options: WsOptions) {
    this.logger = options.logger || new Logger();
    this.options = {
      wsType: 'ws',
      ...options,
    };

    this.nodes = [];
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

    connection.on('newTrans', (transaction: AnyTransaction) => {
      if (transaction.recipientId !== this.options.admAddress) {
        return;
      }

      this.handle(transaction);
    });

    this.connection = connection;
  }

  /**
   * Sets an error handler for all event handlers.
   *
   * @example
   * ```js
   * socket.onMessage(() => throw new Error('catch me'))
   *
   * socket.catch((error) => {
   *   console.log(error) // Error: catch me
   * })
   * ```
   */
  public catch(callback: ErrorHandler) {
    this.errorHandler = callback;
  }

  /**
   * Removes the handler from all types.
   */
  public off(handler: SingleTransactionHandler) {
    for (const [, handlers] of Object.entries(this.eventHandlers)) {
      const index = (handlers as SingleTransactionHandler[]).indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }

    return this;
  }

  /**
   * Adds an event listener handler for all transaction types.
   */
  public on(handler: AnyTransactionHandler): this;
  /**
   * Adds an event listener handler for the specific transaction types.
   */
  public on<T extends EventType>(
    types: T | T[],
    handler: TransactionHandler<TransactionMap[T]>
  ): this;
  public on<T extends EventType>(
    typesOrHandler: T | T[] | AnyTransactionHandler,
    handler?: TransactionHandler<TransactionMap[T]>
  ) {
    if (handler === undefined) {
      if (typeof typesOrHandler === 'function') {
        for (const trigger of Object.keys(this.eventHandlers)) {
          this.eventHandlers[+trigger as EventType].push(typesOrHandler);
        }
      }
    } else {
      const triggers = Array.isArray(typesOrHandler)
        ? typesOrHandler
        : [typesOrHandler];

      for (const trigger of triggers) {
        this.eventHandlers[trigger as T].push(handler);
      }
    }

    return this;
  }

  /**
   * Wrapper function for .on(TransactionType.CHAT_MESSAGE, handler)
   */
  public onMessage(handler: TransactionHandler<ChatMessageTransaction>) {
    return this.on(TransactionType.CHAT_MESSAGE, handler);
  }

  /**
   * Registers an event handler for Token Transfer transactions.
   */
  public onTransfer(handler: TransactionHandler<TokenTransferTransaction>) {
    return this.on(TransactionType.SEND, handler);
  }

  /**
   * Registers an event handler for Register Delegate transactions.
   */
  public onNewDelegate(
    handler: TransactionHandler<RegisterDelegateTransaction>
  ) {
    return this.on(TransactionType.DELEGATE, handler);
  }

  /**
   * Registers an event handler for Vote for Delegate transactions.
   */
  public onVoteForDelegate(
    handler: TransactionHandler<VoteForDelegateTransaction>
  ) {
    return this.on(TransactionType.VOTE, handler);
  }

  /**
   * Registers an event handler for Key-Value Store (KVS) transactions.
   */
  public onKVS(handler: TransactionHandler<KVSTransaction>) {
    return this.on(TransactionType.STATE, handler);
  }

  private async handle<T extends EventType>(transaction: AnyTransaction) {
    const handlers = this.eventHandlers[transaction.type as T];

    for (const handler of handlers) {
      try {
        await handler(transaction as TransactionMap[T]);
      } catch (error) {
        this.errorHandler(error);
      }
    }
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
