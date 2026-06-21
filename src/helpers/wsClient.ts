import {io, type Socket} from 'socket.io-client';

import type {ActiveNode} from './healthCheck';
import {Logger} from './logger';
import {getRandomIntInclusive} from './validator';
import {MessageType, TransactionType} from './constants';
import type {
  AnyTransaction,
  ChatMessageTransaction,
  KVSTransaction,
  RegisterDelegateTransaction,
  TokenTransferTransaction,
  VoteForDelegateTransaction,
} from '../api/generated';
import type {AdamantAddress} from '../api';

export type WsType = 'ws' | 'wss';

export const transactionDirections = [
  'allDirections',
  'self',
  'incoming',
  'outgoing',
] as const;

/** Direction of transactions delivered to WebSocket handlers. */
export type TransactionDirection = (typeof transactionDirections)[number];

export interface WsOptions {
  /**
   * ADM address to subscribe to. Kept for backward compatibility.
   */
  admAddress?: AdamantAddress;

  /** ADM addresses to subscribe to. */
  admAddresses?: AdamantAddress[];

  /** Transaction types to subscribe to. */
  types?: number[];

  /** `transaction.asset.chat.type` values to subscribe to. */
  assetChatTypes?: number[];

  /**
   * Direction of transactions delivered to handlers. Filtering is performed
   * client-side against the subscribed ADM address(es). Default is
   * `allDirections`.
   */
  direction?: TransactionDirection;

  /**
   * Websocket type: `'wss'` or `'ws'`. `'wss'` is recommended.
   */
  wsType?: WsType;

  /**
   * Must connect to node with minimum ping. Not recommended. Default is `false`.
   */
  useFastest?: boolean;

  /** Maximum reconnection attempts. Default is `3`. */
  maxTries?: number;

  /** Delay between reconnection attempts in milliseconds. Default is `5000`. */
  reconnectionDelay?: number;

  logger?: Logger;
}

type ErrorHandler = (error: unknown) => void;
type ConnectionHandler = (connectedNode: string) => void;

type TransactionMap = {
  [TransactionType.SEND]: TokenTransferTransaction;
  [TransactionType.DELEGATE]: RegisterDelegateTransaction;
  [TransactionType.VOTE]: VoteForDelegateTransaction;
  [TransactionType.CHAT_MESSAGE]: ChatMessageTransaction;
  [TransactionType.STATE]: KVSTransaction;
};

type EventType = keyof TransactionMap;

export type TransactionHandler<T extends AnyTransaction> = (
  transaction: T,
) => void;

export type SingleTransactionHandler =
  | TransactionHandler<TokenTransferTransaction>
  | TransactionHandler<RegisterDelegateTransaction>
  | TransactionHandler<VoteForDelegateTransaction>
  | TransactionHandler<ChatMessageTransaction>
  | TransactionHandler<KVSTransaction>;

export type AnyTransactionHandler = TransactionHandler<AnyTransaction>;

export class AdamantWsConnectionError extends Error {
  constructor(
    public readonly reason: 'connection_error' | 'disconnection',
    public readonly details: string,
  ) {
    super(details);
    this.name = 'AdamantWsConnectionError';
  }
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

  private reconnectTimer?: ReturnType<typeof setTimeout>;

  private reconnectTry = 0;

  private hasConnected = false;

  private manuallyDisconnected = false;

  /**
   * List of nodes that are active, synced and support socket.
   */
  private nodes: ActiveNode[];

  private logger: Logger;

  private errorHandler: ErrorHandler;
  private connectionHandler: ConnectionHandler;
  private reconnectionHandler: ConnectionHandler;
  private transactionHandlers: {
    [T in EventType]: TransactionHandler<TransactionMap[T]>[];
  } = {
    [TransactionType.SEND]: [],
    [TransactionType.DELEGATE]: [],
    [TransactionType.VOTE]: [],
    [TransactionType.CHAT_MESSAGE]: [],
    [TransactionType.STATE]: [],
  };
  private messageHandlers: Record<
    MessageType,
    TransactionHandler<ChatMessageTransaction>[]
  > = {
    [MessageType.Chat]: [],
    [MessageType.Rich]: [],
    [MessageType.Signal]: [],
  };

  constructor(options: WsOptions) {
    this.logger = options.logger || new Logger();
    this.options = {
      wsType: 'ws',
      useFastest: false,
      maxTries: 3,
      reconnectionDelay: 5000,
      direction: 'allDirections',
      ...options,
    };

    this.nodes = [];

    this.errorHandler = (error: unknown) => {
      this.logger.error(`[ADAMANT js-api Socket] ${error}`);
    };
    this.connectionHandler = node => {
      this.logger.info(`[ADAMANT js-api Socket] Connected to ${node}`);
    };
    this.reconnectionHandler = node => {
      this.logger.info(`[ADAMANT js-api Socket] Reconnected to ${node}`);
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
        // Remove nodes without IP if 'ws' connection type
        (wsType !== 'ws' || !node.isHttps || node.ip),
    );

    this.connect();
  }

  /**
   * Chooses node and sets up connection.
   */
  setConnection() {
    const {logger} = this;

    const supportedCount = this.nodes.length;
    if (!supportedCount) {
      logger.warn(
        '[ADAMANT js-api Socket] No supported socket nodes at the moment.',
      );
      return;
    }

    const node = this.chooseNode();
    const isReconnection = this.hasConnected || this.reconnectTry > 0;
    logger.log(
      `[ADAMANT js-api Socket] Supported nodes: ${supportedCount}. ${isReconnection ? `Reconnecting (${this.reconnectTry}/${this.options.maxTries})` : 'Connecting'} to ${node}…`,
    );
    const connection = io(node, {
      reconnection: false,
      timeout: 5000,
    });

    connection.on('connect', () => {
      this.reconnectTry = 0;
      this.subscribe(connection);

      if (this.hasConnected) {
        this.reconnectionHandler(node);
      } else {
        this.connectionHandler(node);
      }
      this.hasConnected = true;
    });

    connection.on('disconnect', reason => {
      if (this.manuallyDisconnected || reason === 'io client disconnect') {
        return;
      }

      logger.warn(`[ADAMANT js-api Socket] Disconnected. Reason: ${reason}`);
      this.scheduleReconnect('disconnection', String(reason));
    });

    connection.on('connect_error', error => {
      logger.warn(`[ADAMANT js-api Socket] Connection error: ${error}`);
      this.scheduleReconnect('connection_error', String(error));
    });

    connection.on('newTrans', (transaction: AnyTransaction) => {
      void this.handle(transaction);
    });

    this.connection = connection;
  }

  /** Connects using the current healthy-node list. */
  public connect() {
    this.manuallyDisconnected = false;

    // Cancel a scheduled reconnection so it can't spin up a second socket on
    // top of the one we are about to create.
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (!this.connection) {
      this.setConnection();
    }

    return this;
  }

  /** Disconnects and cancels pending reconnection attempts. */
  public disconnect() {
    this.manuallyDisconnected = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.connection?.removeAllListeners();
    this.connection?.disconnect();
    this.connection = undefined;
    return this;
  }

  private subscribe(connection: Socket) {
    const addresses = [
      ...(this.options.admAddress ? [this.options.admAddress] : []),
      ...(this.options.admAddresses ?? []),
    ].filter((address, index, all) => all.indexOf(address) === index);

    if (addresses.length) {
      connection.emit(
        'address',
        addresses.length === 1 ? addresses[0] : addresses,
      );
    }

    const transactionTypes =
      this.options.types ?? nonEmptyEvents(this.transactionHandlers);
    if (transactionTypes.length) {
      connection.emit('types', transactionTypes);
    }

    const messageTypes =
      this.options.assetChatTypes ?? nonEmptyEvents(this.messageHandlers);
    if (messageTypes.length) {
      connection.emit('assetChatTypes', messageTypes);
    }
  }

  private scheduleReconnect(
    reason: 'connection_error' | 'disconnection',
    details: string,
  ) {
    if (this.manuallyDisconnected || this.reconnectTimer) {
      return;
    }

    if (this.reconnectTry >= (this.options.maxTries ?? 3)) {
      // Give up: tear down the dead socket so it can't keep emitting events
      // and triggering the error handler again.
      this.connection?.removeAllListeners();
      this.connection?.disconnect();
      this.connection = undefined;
      this.errorHandler(new AdamantWsConnectionError(reason, details));
      return;
    }

    this.reconnectTry += 1;
    this.connection?.removeAllListeners();
    this.connection?.disconnect();
    this.connection = undefined;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.setConnection();
    }, this.options.reconnectionDelay);
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

  /** Registers a callback for the first successful connection. */
  public onConnection(callback: ConnectionHandler) {
    this.connectionHandler = callback;
    return this;
  }

  /** Registers a callback for successful reconnections. */
  public onReconnection(callback: ConnectionHandler) {
    this.reconnectionHandler = callback;
    return this;
  }

  /**
   * Removes the handler from all types.
   */
  public off(handler: SingleTransactionHandler) {
    for (const handlers of [
      ...Object.values(this.transactionHandlers),
      ...Object.values(this.messageHandlers),
    ]) {
      let index = (handlers as SingleTransactionHandler[]).indexOf(handler);
      while (index !== -1) {
        handlers.splice(index, 1);
        index = (handlers as SingleTransactionHandler[]).indexOf(handler);
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
    handler: TransactionHandler<TransactionMap[T]>,
  ): this;
  public on<T extends EventType>(
    typesOrHandler: T | T[] | AnyTransactionHandler,
    handler?: TransactionHandler<TransactionMap[T]>,
  ) {
    if (handler === undefined) {
      if (typeof typesOrHandler === 'function') {
        for (const trigger of Object.keys(this.transactionHandlers)) {
          this.transactionHandlers[+trigger as EventType].push(typesOrHandler);
        }
      }
    } else {
      const triggers = Array.isArray(typesOrHandler)
        ? typesOrHandler
        : [typesOrHandler];

      for (const trigger of triggers) {
        this.transactionHandlers[trigger as T].push(handler);
      }
    }

    return this;
  }

  /**
   * Registers an event handler for Chat Message transactions.
   */
  public onMessage(handler: TransactionHandler<ChatMessageTransaction>): this;
  public onMessage(
    messageTypes: MessageType | MessageType[],
    handler: TransactionHandler<ChatMessageTransaction>,
  ): this;
  public onMessage(
    typesOrHandler:
      | MessageType
      | MessageType[]
      | TransactionHandler<ChatMessageTransaction>,
    handler?: TransactionHandler<ChatMessageTransaction>,
  ) {
    if (typeof typesOrHandler === 'function') {
      return this.on(TransactionType.CHAT_MESSAGE, typesOrHandler);
    }

    const messageTypes = Array.isArray(typesOrHandler)
      ? typesOrHandler
      : [typesOrHandler];
    for (const messageType of messageTypes) {
      this.messageHandlers[messageType].push(handler!);
    }
    return this;
  }

  /** Registers a handler for plain chat messages. */
  public onChatMessage(handler: TransactionHandler<ChatMessageTransaction>) {
    return this.onMessage(MessageType.Chat, handler);
  }

  /** Registers a handler for rich messages. */
  public onRichMessage(handler: TransactionHandler<ChatMessageTransaction>) {
    return this.onMessage(MessageType.Rich, handler);
  }

  /** Registers a handler for signal messages. */
  public onSignalMessage(handler: TransactionHandler<ChatMessageTransaction>) {
    return this.onMessage(MessageType.Signal, handler);
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
    handler: TransactionHandler<RegisterDelegateTransaction>,
  ) {
    return this.on(TransactionType.DELEGATE, handler);
  }

  /**
   * Registers an event handler for Vote for Delegate transactions.
   */
  public onVoteForDelegate(
    handler: TransactionHandler<VoteForDelegateTransaction>,
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
    const directions = this.getTransactionDirections(transaction);
    const direction = directions.join('+') || 'unrelated';
    const filter = this.options.direction ?? 'allDirections';

    this.logger.debug(
      `[ADAMANT js-api Socket] Received transaction ${transaction.id ?? '(without id)'} (type: ${transaction.type}, direction: ${direction}, filter: ${filter}).`,
    );

    if (filter !== 'allDirections' && !directions.includes(filter)) {
      return;
    }

    const handlers = this.transactionHandlers[transaction.type as T] ?? [];

    for (const handler of handlers) {
      try {
        await handler(transaction as TransactionMap[T]);
      } catch (error) {
        this.errorHandler(error);
      }
    }

    if (transaction.type === TransactionType.CHAT_MESSAGE) {
      const messageType = transaction.asset.chat.type as MessageType;
      for (const handler of this.messageHandlers[messageType] ?? []) {
        try {
          await handler(transaction);
        } catch (error) {
          this.errorHandler(error);
        }
      }
    }
  }

  private getTransactionDirections(
    transaction: AnyTransaction,
  ): Exclude<TransactionDirection, 'allDirections'>[] {
    const addresses = new Set<AdamantAddress>([
      ...(this.options.admAddress ? [this.options.admAddress] : []),
      ...(this.options.admAddresses ?? []),
    ]);
    const senderId = transaction.senderId as AdamantAddress;
    const recipientId = transaction.recipientId as AdamantAddress | null;
    const isSender = addresses.has(senderId);
    const isRecipient = recipientId !== null && addresses.has(recipientId);

    if (isSender && isRecipient && senderId === recipientId) {
      return ['self'];
    }

    const directions: Exclude<TransactionDirection, 'allDirections'>[] = [];
    if (isRecipient) {
      directions.push('incoming');
    }
    if (isSender) {
      directions.push('outgoing');
    }
    return directions;
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

const nonEmptyEvents = (handlers: Record<string, unknown[]>) =>
  Object.entries(handlers)
    .filter(([, callbacks]) => callbacks.length > 0)
    .map(([event]) => Number(event));
