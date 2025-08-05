import { io, type Socket } from 'socket.io-client'

import type { ActiveNode } from './healthCheck'
import { Logger } from './logger'
import { getRandomIntInclusive } from './validator'
import { MessageType, TransactionType } from './constants'
import type {
  AnyTransaction,
  ChatMessageTransaction,
  KVSTransaction,
  RegisterDelegateTransaction,
  TokenTransferTransaction,
  VoteForDelegateTransaction
} from '../api/generated'
import type { AdamantAddress } from '../api'

export type WsType = 'ws' | 'wss'

export interface WsOptions {
  /**
   * ADM address to subscribe to notifications
   */
  admAddress: AdamantAddress | AdamantAddress[]

  /**
   * Websocket type: `'wss'` or `'ws'`. `'wss'` is recommended.
   */
  wsType?: WsType

  /**
   * Must connect to node with minimum ping. Not recommended. Default is `false`.
   */
  useFastest?: boolean

  logger?: Logger
}

type ErrorHandler = (error: unknown) => void

type TransactionMap = {
  [TransactionType.SEND]: TokenTransferTransaction
  [TransactionType.DELEGATE]: RegisterDelegateTransaction
  [TransactionType.VOTE]: VoteForDelegateTransaction
  [TransactionType.CHAT_MESSAGE]: ChatMessageTransaction
  [TransactionType.STATE]: KVSTransaction
}

type EventType = keyof TransactionMap

export type TransactionHandler<T extends AnyTransaction> = (transaction: T) => void

export type SingleTransactionHandler =
  | TransactionHandler<TokenTransferTransaction>
  | TransactionHandler<RegisterDelegateTransaction>
  | TransactionHandler<VoteForDelegateTransaction>
  | TransactionHandler<ChatMessageTransaction>
  | TransactionHandler<KVSTransaction>

export type AnyTransactionHandler = TransactionHandler<AnyTransaction>

export class WebSocketClient {
  /**
   * Web socket client options.
   */
  public options: WsOptions

  /**
   * Current socket connection
   */
  private connection?: Socket

  /**
   * List of nodes that are active, synced and support socket.
   */
  private nodes: ActiveNode[]

  private logger: Logger

  private errorHandler: ErrorHandler
  private transactionHandlers: {
    [T in EventType]: TransactionHandler<TransactionMap[T]>[]
  } = {
    [TransactionType.SEND]: [],
    [TransactionType.DELEGATE]: [],
    [TransactionType.VOTE]: [],
    [TransactionType.CHAT_MESSAGE]: [],
    [TransactionType.STATE]: []
  }
  private messageHandlers: {
    [T in MessageType]: TransactionHandler<ChatMessageTransaction>[]
  } = {
    [MessageType.Chat]: [],
    [MessageType.Rich]: [],
    [MessageType.Signal]: []
  }

  constructor(options: WsOptions) {
    this.logger = options.logger || new Logger()
    this.options = {
      wsType: 'ws',
      ...options
    }

    this.nodes = []

    this.errorHandler = (error: unknown) => {
      this.logger.error(`${error}`)
    }
  }

  /**
   * Filters nodes that support websocket and connects to one of them.
   *
   * @param nodes Sorted by ping array of active nodes
   */
  reviseConnection(nodes: ActiveNode[]) {
    if (this.connection?.connected) {
      return
    }

    const { wsType } = this.options

    this.nodes = nodes.filter(
      (node) =>
        node.socketSupport &&
        !node.outOfSync &&
        // Remove nodes without IP if 'ws' connection type
        (wsType !== 'ws' || !node.isHttps || node.ip)
    )

    this.setConnection()
  }

  /**
   * Chooses node and sets up connection.
   */
  setConnection() {
    const { logger } = this

    const supportedCount = this.nodes.length
    if (!supportedCount) {
      logger.warn('[Socket] No supported socket nodes at the moment.')
      return
    }

    const node = this.chooseNode()
    logger.log(`[Socket] Supported nodes: ${supportedCount}. Connecting to ${node}...`)
    const connection = io(node, {
      reconnection: false,
      timeout: 5000
    })

    connection.on('connect', () => {
      const { admAddress } = this.options

      connection.emit('address', admAddress)

      const transactionTypes = notEmptyEvents(this.transactionHandlers)
      const messageTypes = notEmptyEvents(this.messageHandlers)

      if (transactionTypes.length !== 0) {
        connection.emit('types', transactionTypes)
      }

      // not to break any socket.on(TransactionType.CHAT_MESSAGE, ...) handler
      if (messageTypes.length !== 0 && !transactionTypes.includes(TransactionType.CHAT_MESSAGE)) {
        connection.emit('assetChatTypes', messageTypes)
      }

      logger.info(
        `[Socket] Connected to ${node} and subscribed to incoming transactions for ${
          Array.isArray(admAddress) ? admAddress.join(', ') : admAddress
        }`
      )
    })

    connection.on('disconnect', (reason) => logger.warn(`[Socket] Disconnected. Reason: ${reason}`))

    connection.on('connect_error', (error) => logger.warn(`[Socket] Connection error: ${error}`))

    connection.on('newTrans', (transaction: AnyTransaction) => {
      const { admAddress } = this.options

      const addresses = Array.isArray(admAddress) ? admAddress : [admAddress]
      if (!addresses.includes(transaction.recipientId as AdamantAddress)) {
        return
      }

      this.handle(transaction).catch((error) => this.errorHandler(error))
    })

    this.connection = connection
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
    this.errorHandler = callback
    return this
  }

  /**
   * Removes the handler from all types.
   */
  public off(handler: SingleTransactionHandler) {
    for (const handlers of Object.values(this.transactionHandlers)) {
      const index = (handlers as SingleTransactionHandler[]).indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }

    return this
  }

  /**
   * Adds an event listener handler for all transaction types.
   */
  public on(handler: AnyTransactionHandler): this
  /**
   * Adds an event listener handler for the specific transaction types.
   */
  public on<T extends EventType>(
    types: T | T[],
    handler: TransactionHandler<TransactionMap[T]>
  ): this
  public on<T extends EventType>(
    typesOrHandler: T | T[] | AnyTransactionHandler,
    handler?: TransactionHandler<TransactionMap[T]>
  ) {
    if (handler === undefined) {
      if (typeof typesOrHandler === 'function') {
        for (const trigger of Object.keys(this.transactionHandlers)) {
          this.transactionHandlers[+trigger as EventType].push(typesOrHandler)
        }
      }
    } else {
      const triggers = Array.isArray(typesOrHandler) ? typesOrHandler : [typesOrHandler]

      for (const trigger of triggers) {
        this.transactionHandlers[trigger as T].push(handler)
      }
    }

    return this
  }

  /**
   * Registers an event handler for Chat Message transactions.
   */
  public onMessage<T extends MessageType>(
    messageTypes: T | T[],
    handler: TransactionHandler<ChatMessageTransaction>
  ): this
  /**
   * Registers an event handler for specific Chat Message types.
   */
  public onMessage<T extends MessageType>(
    typesOrHandler: T | T[] | TransactionHandler<ChatMessageTransaction>,
    handler?: TransactionHandler<ChatMessageTransaction>
  ) {
    if (handler === undefined) {
      if (typeof typesOrHandler === 'function') {
        return this.on(TransactionType.CHAT_MESSAGE, typesOrHandler)
      }
    } else {
      const triggers = Array.isArray(typesOrHandler) ? typesOrHandler : [typesOrHandler]

      for (const trigger of triggers) {
        this.messageHandlers[trigger as T].push(handler)
      }
    }

    return this
  }

  /**
   * Registers an event handler for Chat Message transactions (type 1).
   */
  public onChatMessage(handler: TransactionHandler<ChatMessageTransaction>) {
    return this.onMessage(MessageType.Chat, handler)
  }

  /**
   * Registers an event handler for Rich Message transactions (type 2).
   */
  public onRichMessage(handler: TransactionHandler<ChatMessageTransaction>) {
    return this.onMessage(MessageType.Rich, handler)
  }

  /**
   * Registers an event handler for Signal Message transactions (type 3).
   */
  public onSignalMessage(handler: TransactionHandler<ChatMessageTransaction>) {
    return this.onMessage(MessageType.Signal, handler)
  }

  /**
   * Registers an event handler for Token Transfer transactions.
   */
  public onTransfer(handler: TransactionHandler<TokenTransferTransaction>) {
    return this.on(TransactionType.SEND, handler)
  }

  /**
   * Registers an event handler for Register Delegate transactions.
   */
  public onNewDelegate(handler: TransactionHandler<RegisterDelegateTransaction>) {
    return this.on(TransactionType.DELEGATE, handler)
  }

  /**
   * Registers an event handler for Vote for Delegate transactions.
   */
  public onVoteForDelegate(handler: TransactionHandler<VoteForDelegateTransaction>) {
    return this.on(TransactionType.VOTE, handler)
  }

  /**
   * Registers an event handler for Key-Value Store (KVS) transactions.
   */
  public onKVS(handler: TransactionHandler<KVSTransaction>) {
    return this.on(TransactionType.STATE, handler)
  }

  private async handle<T extends EventType>(transaction: AnyTransaction) {
    const transactionHandlers = this.transactionHandlers[transaction.type as T]

    for (const handler of transactionHandlers) {
      try {
        await handler(transaction as TransactionMap[T])
      } catch (error) {
        this.errorHandler(error)
      }
    }

    if (transaction.type === TransactionType.CHAT_MESSAGE) {
      const assetChatType = transaction.asset.chat.type
      const messageHandlers = this.messageHandlers[assetChatType]

      for (const handler of messageHandlers) {
        try {
          await handler(transaction)
        } catch (error) {
          this.errorHandler(error)
        }
      }
    }
  }

  /**
   * Chooses fastest or random node based on {@link WsOptions.useFastest} option
   *
   * @returns WebSocket url
   */
  chooseNode(): string {
    const { wsType, useFastest } = this.options

    const node = useFastest ? this.fastestNode() : this.randomNode()

    let baseURL: string

    if (wsType === 'ws') {
      const host = node.ip ? node.ip : node.baseURL

      baseURL = `${host}:${node.wsPort}`
    } else {
      baseURL = node.baseURL // no port if wss
    }

    return `${wsType}://${baseURL}`
  }

  fastestNode() {
    return this.nodes[0] // They are already sorted by ping
  }

  randomNode() {
    const randomIndex = getRandomIntInclusive(0, this.nodes.length - 1)
    return this.nodes[randomIndex]
  }
}

function notEmptyEvents(handlers: Record<string, Array<unknown>>): number[] {
  const events: number[] = []

  for (const key in handlers) {
    if (Object.prototype.hasOwnProperty.call(handlers, key)) {
      const array = handlers[key]
      if (Array.isArray(array) && array.length !== 0) {
        events.push(Number(key))
      }
    }
  }

  return events
}
