import {io, type Socket} from 'socket.io-client';

import type {ActiveNode} from '../healthCheck';
import {Logger} from '../logger';
import {getRandomIntInclusive} from '../validator';
import {TransactionType} from '../constants';
import type {
  AnyTransaction,
  ChatMessageTransaction,
  KVSTransaction,
  RegisterDelegateTransaction,
  TokenTransferTransaction,
  VoteForDelegateTransaction,
} from '../../api/generated';
import type {AdamantAddress} from '../../api';
import {AdamantWsConnectionError} from './error';

export type WsType = 'ws' | 'wss';

export interface WsOptions {
  /**
   * ADM address to subscribe to transactions
   */
  admAddress?: AdamantAddress;

  /**
   * Multiple ADM addresses to subscribe to transactions
   */
  admAddresses?: AdamantAddress[];

  /**
   * Transaction types to subscribe
   */
  types?: number[];

  /**
   * Message types to subscribe
   */
  assetChatTypes?: number[];

  /**
   * Websocket type: `'wss'` or `'ws'`. `'wss'` is recommended
   */
  wsType?: WsType;

  /**
   * Must connect to node with minimum ping. Not recommended. Default is `false`
   */
  useFastest?: boolean;

  /**
   * Max tries to reconnect to the websocket. Until the connection is established,
   * transactions will be pulled from the node's REST API
   *
   * Default is `3`
   */
  maxTries?: number;

  /**
   * Delay before reconnection in ms
   *
   * Default is `5000`
   */
  reconnectionDelay?: number;

  logger?: Logger | null;
}

type ErrorHandler = (error: unknown) => void;
type ConnectionHandler = (node: string) => void;

type TransactionMap = {
  [TransactionType.SEND]: TokenTransferTransaction;
  [TransactionType.DELEGATE]: RegisterDelegateTransaction;
  [TransactionType.VOTE]: VoteForDelegateTransaction;
  [TransactionType.CHAT_MESSAGE]: ChatMessageTransaction;
  [TransactionType.STATE]: KVSTransaction;
};

type EventType = keyof TransactionMap;

export type TransactionHandler<T extends AnyTransaction> = (
  transaction: T
) => void;

export type SingleTransactionHandler =
  | TransactionHandler<TokenTransferTransaction>
  | TransactionHandler<RegisterDelegateTransaction>
  | TransactionHandler<VoteForDelegateTransaction>
  | TransactionHandler<ChatMessageTransaction>
  | TransactionHandler<KVSTransaction>;

export type AnyTransactionHandler = TransactionHandler<AnyTransaction>;

export interface ReconnectReason {
  reason: string;
  message: Error | string;
  tryNo: number;
}

export interface ReconnectOptions {
  try?: number;
}

export class WebSocketClient {
  /**
   * Web socket client options
   */
  public options: WsOptions;

  /**
   * Current socket connection
   */
  private connection?: Socket;

  /**
   * List of nodes that are active, synced and support socket
   */
  private nodes: ActiveNode[];

  private maxTries: number;
  private logger: Logger;

  private errorHandler: ErrorHandler;
  private connectionHandler: ConnectionHandler;
  private reconnectionHandler: ConnectionHandler;

  private eventHandlers: {
    [T in EventType]: TransactionHandler<TransactionMap[T]>[];
  } = {
    [TransactionType.SEND]: [],
    [TransactionType.DELEGATE]: [],
    [TransactionType.VOTE]: [],
    [TransactionType.CHAT_MESSAGE]: [],
    [TransactionType.STATE]: [],
  };

  constructor(options: WsOptions) {
    this.options = {
      logger: null,
      useFastest: false,
      wsType: 'ws',
      reconnectionDelay: 5000,
      ...options,
    };

    this.maxTries = options.maxTries ?? 3;

    const logger = options.logger || new Logger();

    this.logger = logger;
    this.nodes = [];

    this.errorHandler = (error: unknown) => {
      logger.error(`${error}`);
    };

    this.connectionHandler = (node: string) => {
      logger.info(`[Socket] Connected to ${node}`);
    };

    this.reconnectionHandler = (node: string) => {
      logger.info(`[Socket] Reconnected to ${node}`);
    };
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
        // Remove nodes without IP if connection type in options set to 'ws'
        (wsType !== 'ws' || !node.isHttps || node.ip)
    );

    this.setConnection();
  }

  /**
   * Chooses node and sets up connection.
   */
  setConnection(tryNo = 0) {
    const {logger} = this;

    const supportedCount = this.nodes.length;
    if (!supportedCount) {
      logger.warn('[Socket] No supported socket nodes at the moment.');
      return;
    }

    const node = this.chooseNode();

    const isFirstConnection = tryNo === 0;

    if (isFirstConnection) {
      logger.log(
        `[Socket] Supported nodes: ${supportedCount}. Connecting to ${node}...`
      );
    } else {
      logger.log(
        `[Socket] (${tryNo}/${this.maxTries}) Reconnecting to ${node}...`
      );
    }

    const connection = io(node, {
      reconnection: false,
      timeout: 5000,
    });

    connection.on('connect', () => {
      this.subscribe();

      if (isFirstConnection) {
        this.connectionHandler(node);
      } else {
        this.reconnectionHandler(node);
      }
    });

    connection.on('disconnect', reason =>
      this.reconnect({
        reason: 'disconnection',
        message: reason,
        tryNo,
      })
    );

    connection.on('connect_error', errorMessage =>
      this.reconnect({
        reason: 'connection_error',
        message: errorMessage,
        tryNo,
      })
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
   * Subscribe to the provided in options addresses and transaction types
   */
  private subscribe() {
    const {options, connection, logger} = this;

    if (!connection) {
      return;
    }

    if (options.admAddress) {
      connection.emit('address', options.admAddress);
      logger.log(
        `[Socket] Subscribed to incoming transactions for ${options.admAddress}`
      );
    }

    if (options.admAddresses) {
      connection.emit('address', options.admAddresses);
      logger.log(
        `[Socket] Subscribed to incoming transactions for ${options.admAddresses.join(
          ', '
        )}`
      );
    }

    if (options.types) {
      connection.emit('types', options.types);
      logger.log(
        `[Socket] Subscribed to incoming transactions for ${options.types.join(
          ', '
        )} types`
      );
    }

    if (options.assetChatTypes) {
      connection.emit('assetChatTypes', options.assetChatTypes);
      logger.log(
        `[Socket] Subscribed to incoming transactions for ${options.assetChatTypes.join(
          ', '
        )} message types`
      );
    }
  }

  private reconnect(reconnectReason: ReconnectReason) {
    this.connection?.disconnect();
    this.connection?.removeAllListeners();

    if (reconnectReason.tryNo > this.maxTries) {
      const error = new AdamantWsConnectionError(
        reconnectReason.reason,
        reconnectReason.message
      );
      this.errorHandler(error);
      return;
    }

    const nextTry = reconnectReason.tryNo + 1;

    setTimeout(
      () => this.setConnection(nextTry),
      this.options.reconnectionDelay
    );
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
    return this;
  }

  /**
   * Sets a listener for connection.
   *
   * @example
   * ```js
   * socket.onConnection((node) => {
   *   console.log(`Connected to ${node} node`)
   * })
   * ```
   */
  public onConnection(callback: ConnectionHandler) {
    this.connectionHandler = callback;
    return this;
  }

  /**
   * Sets a handler for REconnection.
   *
   * @example
   * ```js
   * socket.onConnection((node) => {
   *   console.log(`Connected to ${node} node`)
   * })
   * ```
   */
  public onReconnection(callback: ConnectionHandler) {
    this.reconnectionHandler = callback;
    return this;
  }

  /**
   * Removes the handler from all types.
   */
  public off(handler: SingleTransactionHandler) {
    for (const handlers of Object.values(this.eventHandlers)) {
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
        const triggers = Object.keys(this.eventHandlers);

        this.connection?.emit('types', triggers);

        for (const trigger of triggers) {
          this.eventHandlers[+trigger as EventType].push(typesOrHandler);
        }
      }
    } else {
      const triggers = Array.isArray(typesOrHandler)
        ? typesOrHandler
        : [typesOrHandler];

      this.connection?.emit('types', triggers);

      for (const trigger of triggers) {
        this.eventHandlers[trigger as T].push(handler);
      }
    }

    return this;
  }

  /**
   * Registers an event handler for Chatn Message transactions.
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
