/**
 * ADM HTTP client (`AdamantApi`): resilient node access with health checks,
 * retries, and failover; typed request options; and the generated ADAMANT API
 * DTO types.
 *
 * @module
 */

import axios, {AxiosError} from 'axios';
import {NodeManager, NodeManagerOptions} from '../helpers/healthCheck';
import {
  Logger,
  type CustomLogger,
  type LogLevel,
  type LogLevelName,
} from '../helpers/logger';
import {
  AdamantApiResult,
  admToSats,
  badParameter,
  isAdmAddress,
  isAdmPublicKey,
  isAdmVoteForAddress,
  isAdmVoteForDelegateName,
  isAdmVoteForPublicKey,
  isDelegateName,
  isIntegerAmount,
  isMessageType,
  isPassphrase,
  validateMessage,
} from '../helpers/validator';
import {DEFAULT_GET_REQUEST_RETRIES, MessageType} from '../helpers/constants';

import type {
  DelegateDto,
  CreateNewAccountResponseDto,
  GetAccountBalanceResponseDto,
  GetAccountInfoResponseDto,
  GetAccountPublicKeyResponseDto,
  GetAccountVotesResponseDto,
  GetBlockInfoResponseDto,
  GetBlocksResponseDto,
  GetBroadhashResponseDto,
  GetChatMessagesResponseDto,
  GetChatRoomsResponseDto,
  GetChatTransactionsResponseDto,
  GetDelegateResponseDto,
  GetDelegateStatsResponseDto,
  GetDelegatesCountResponseDto,
  GetDelegatesResponseDto,
  GetEpochResponseDto,
  GetHeightResponseDto,
  GetLoadingStatusResponseDto,
  GetMilestoneResponseDto,
  GetNethashResponseDto,
  GetNetworkInfoResponseDto,
  GetNextForgersResponseDto,
  GetNodeStatusResponseDto,
  GetNodeVersionResponseDto,
  GetPeersResponseDto,
  GetPeerInfoResponseDto,
  GetPingStatusResponseDto,
  GetQueuedTransactionsResponseDto,
  GetRewardResponseDto,
  GetSyncStatusResponseDto,
  GetTokenTransferFeeResponseDto,
  GetTokensTotalSupplyResponseDto,
  GetTransactionByIdResponseDto,
  GetTransactionTypesFeesResponseDto,
  GetTransactionsCountResponseDto,
  GetTransactionsResponseDto,
  GetUnconfirmedTransactionByIdResponseDto,
  GetUnconfirmedTransactionsResponseDto,
  GetVotersResponseDto,
  GetKVSResponseDto,
  RegisterTransactionRequestBody,
  RegisterTransactionResponseDto,
  SearchDelegateResponseDto,
  SetKVSRequestBody,
  SetKVSResponseDto,
} from './generated';
import {
  createAddressFromPublicKey,
  createKeypairFromPassphrase,
} from '../helpers/keys';
import {
  createChatTransaction,
  createDelegateTransaction,
  createSendTransaction,
  createVoteTransaction,
} from '../helpers/transactions';
import {encodeMessage} from '../helpers/encryptor';
import {
  type VoteDirection,
  transformTransactionQuery,
  parseVote,
  isVoteDirection,
} from './utils';

export type AdamantAddress = `U${string}`;

export interface UsernameObject {
  username: string;
}

export interface PublicKeyObject {
  publicKey: string;
}

export interface AddressObject {
  address: string;
}

/**
 * Object that contains either `address` or `publicKey` field
 */
export type AddressOrPublicKeyObject = AddressObject | PublicKeyObject;

/**
 * Object that contains either `username` or `publicKey` field
 */
export type UsernameOrPublicKeyObject = UsernameObject | PublicKeyObject;

/** Object that identifies a delegate by username, public key, or address. */
export type DelegateLookupOptions =
  | UsernameObject
  | PublicKeyObject
  | AddressObject;

/**
 * A transaction query.
 *
 * Top-level filter conditions are combined with `and` by default — every
 * condition must match. This differs from the raw node API, whose default is
 * `or`. To opt into `or`, wrap fields in `or`; an explicit `and` wrapper is
 * also supported and is equivalent to passing those fields at the top level.
 *
 * Control and pagination parameters (`limit`, `offset`, `orderBy`,
 * `returnAsset`, `returnUnconfirmed`, the direct-transfer flags, and `userId`)
 * are not filters and are always sent as-is.
 *
 * @see https://docs.adamant.im/api/transactions-query-language.html#combine-filters-and-options
 */
export type TransactionQuery<T extends object> = Partial<T> & {
  /** Filter conditions combined with `or`. */
  or?: Partial<T>;
  /** Filter conditions combined with `and` (the default for top-level fields). */
  and?: Partial<T>;
};

export interface GetBlocksOptions {
  limit?: number;
  offset?: number;
  generatorPublicKey?: string;
  height?: number;
}

export interface GetDelegatesOptions {
  limit?: number;
  offset?: number;
}

export interface GetPeersOptions {
  limit?: number;
  offset?: number;
  os?: string;
  ip?: string;
}

export interface TransactionQueryParameters {
  returnUnconfirmed?: 1 | 0;
  blockId?: string;
  fromHeight?: number;
  toHeight?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
  minAmount?: number;
  maxAmount?: number;
  minFee?: number;
  maxFee?: number;
  minConfirmations?: number;
  senderId?: string;
  recipientId?: string;
  inId?: string;
  isIn?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
}

// parameters that available for /api/chatrooms
export interface ChatroomsOptions extends TransactionQueryParameters {
  type?: number;
  userId?: string;
  includeDirectTransfers?: boolean | 1 | 0;
  /** @deprecated Use `includeDirectTransfers` instead. */
  withoutDirectTransfers?: boolean | 1 | 0;
}

// parameters that available for /api/transactions
export interface TransactionsOptions extends TransactionQueryParameters {
  senderIds?: string[];
  recipientIds?: string[];
  senderPublicKey?: string;
  senderPublicKeys?: string[];
  recipientPublicKey?: string;
  recipientPublicKeys?: string[];
  type?: number;
  types?: number[];
  returnAsset?: 1 | 0;
}

export interface KVSOptions extends TransactionQueryParameters {
  senderIds?: string[];
  key?: string;
  keyIds?: string[];
  type?: number;
}

export interface AdamantApiOptions extends NodeManagerOptions {
  nodes: string[];

  maxRetries?: number;
  timeout?: number;

  logger?: CustomLogger;
  logLevel?: LogLevel | LogLevelName;
}

const publicKeysCache: {
  [address: string]: string;
} = {};

const formatAxiosError = (error: AxiosError) => {
  const aggregateErrors =
    typeof error.cause === 'object' &&
    error.cause !== null &&
    'errors' in error.cause &&
    Array.isArray(error.cause.errors)
      ? error.cause.errors
      : undefined;

  if (aggregateErrors) {
    const pending: unknown[] = [...aggregateErrors];
    const messages: string[] = [];

    while (pending.length) {
      const cause = pending.shift();

      if (
        typeof cause === 'object' &&
        cause !== null &&
        'errors' in cause &&
        Array.isArray(cause.errors)
      ) {
        pending.push(...cause.errors);
      } else if (cause instanceof Error && cause.message.trim()) {
        messages.push(cause.message.trim());
      } else if (cause !== undefined) {
        messages.push(String(cause));
      }
    }

    if (messages.length) {
      return [...new Set(messages)].join('; ');
    }
  }

  if (error.message.trim()) {
    return `${error.name}: ${error.message.trim()}`;
  }

  return error.code ? `${error.name} (${error.code})` : error.name;
};

const responseErrorMessage = (data: unknown) => {
  if (typeof data === 'string') {
    return data.trim();
  }

  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    for (const key of ['errorMessage', 'error', 'message'] as const) {
      if (typeof record[key] === 'string') {
        return record[key].trim();
      }
    }
  }

  return '';
};

/**
 * Resilient client for the public ADAMANT Node HTTP API.
 *
 * The client inherits node health checks and failover from the internal
 * `NodeManager` and returns structured API results instead of exposing raw
 * Axios errors.
 */
export class AdamantApi extends NodeManager {
  maxRetries: number;

  constructor(options: AdamantApiOptions) {
    const customLogger = new Logger(options.logLevel, options.logger);

    super(customLogger, options);

    this.maxRetries = options.maxRetries ?? DEFAULT_GET_REQUEST_RETRIES;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data: unknown,
    retryNo = 1,
  ): Promise<AdamantApiResult<T>> {
    const {logger, maxRetries} = this;

    if (!this.hasCompatibleNode) {
      const minVersion = this.options.minVersion;
      return {
        success: false,
        errorMessage: `No compatible ADAMANT nodes are available${minVersion ? `. Minimum required version is ${minVersion}` : ''}.`,
      };
    }

    const url = `${this.node}/api/${endpoint}`;

    try {
      const response = await axios<AdamantApiResult<T>>({
        method,
        url,
        ...(method === 'POST'
          ? {
              data,
            }
          : {
              params: data,
            }),
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const {response} = error;

        const nodeStatus = response?.status
          ? `Request to ${url} failed with HTTP ${response.status}`
          : `Request to ${url} failed`;
        const errorDetails = formatAxiosError(error);

        const responseMessage = responseErrorMessage(response?.data);
        const logMessage = `[ADAMANT js-api] ${method} request: ${nodeStatus}. ${errorDetails}${
          responseMessage ? '. Message: ' + responseMessage : ''
        }.`;

        // A received HTTP response proves that the node is reachable. Retrying a
        // rejected POST can duplicate a transaction, while 4xx and structured API
        // errors are not recoverable by switching nodes. Unstructured GET 5xx
        // failures may safely fail over to another node.
        const shouldRetry =
          !response ||
          (method === 'GET' &&
            response.status >= 500 &&
            responseMessage === '');

        if (shouldRetry && retryNo <= maxRetries) {
          logger.log(`${logMessage} Try ${retryNo}/${maxRetries}. Retrying…`);

          await this.updateNodes();
          return this.request<T>(method, endpoint, data, retryNo + 1);
        }

        logger.warn(`${logMessage} No more attempts, returning error.`);

        return {
          success: false,
          errorMessage: `${responseMessage || errorDetails}.`,
        };
      }

      return {
        success: false,
        errorMessage: `${error}`,
      };
    }
  }

  /**
   * Makes GET request to ADAMANT network.
   *
   * `endpoint` should be in `'accounts/getPublicKey'` format, excluding `'/api/'`.
   */
  async get<T>(endpoint: string, params?: unknown) {
    return this.request<T>('GET', endpoint, params);
  }

  /**
   * Makes POST request to ADAMANT network.
   *
   * `endpoint` should be in `'accounts/getPublicKey'` format, excluding `'/api/'`.
   */
  async post<T>(endpoint: string, options: unknown) {
    return this.request<T>('POST', endpoint, options);
  }

  /**
   * Get account Public Key
   */
  async getPublicKey(address: AdamantAddress) {
    const cached = publicKeysCache[address];
    if (cached) {
      return cached;
    }

    const response = await this.get<GetAccountPublicKeyResponseDto>(
      'accounts/getPublicKey',
      {
        address,
      },
    );

    if (response.success) {
      const {publicKey} = response;

      publicKeysCache[address] = publicKey;
      return publicKey;
    }

    this.logger.warn(
      `[ADAMANT js-api] Failed to get public key for ${address}. ${response.errorMessage}.`,
    );
    return '';
  }

  /** Initializes an account from a public key without transmitting a secret. */
  async createAccount(publicKey: string) {
    if (!isAdmPublicKey(publicKey)) {
      return badParameter('publicKey', publicKey);
    }

    return this.post<CreateNewAccountResponseDto>('accounts/new', {publicKey});
  }

  /**
   * Register new delegate within given username
   *
   * @param username The new delegate's username
   */
  async newDelegate(passphrase: string, username: string) {
    if (!isPassphrase(passphrase)) {
      return badParameter('passphrase');
    }

    if (!isDelegateName(username)) {
      return badParameter('username');
    }

    const keyPair = createKeypairFromPassphrase(passphrase);

    const data = {
      keyPair,
      username,
    };

    const transaction = createDelegateTransaction(data);

    return this.post('delegates', transaction);
  }

  /**
   * Encrypt a message, creates Message transaction, signs it, and broadcasts to ADAMANT network.
   */
  async sendMessage(
    passphrase: string,
    addressOrPublicKey: string,
    message: string,
    type = MessageType.Chat,
    amount?: number,
    isAmountInADM?: boolean,
  ) {
    if (!isPassphrase(passphrase)) {
      return badParameter('passphrase');
    }

    let address: AdamantAddress;
    let publicKey = '';

    if (!isAdmAddress(addressOrPublicKey)) {
      if (!isAdmPublicKey(addressOrPublicKey)) {
        return badParameter('addressOrPublicKey', addressOrPublicKey);
      }

      publicKey = addressOrPublicKey;

      try {
        address = createAddressFromPublicKey(publicKey);
      } catch {
        return badParameter('addressOrPublicKey', addressOrPublicKey);
      }
    } else {
      address = addressOrPublicKey;
    }

    if (!isMessageType(type)) {
      return badParameter('type', type);
    }

    const result = validateMessage(message, type);

    if (!result.success) {
      return badParameter('message', message, result.error);
    }

    let amountInSat: number | undefined;

    if (amount) {
      amountInSat = amount;

      if (isAmountInADM) {
        amountInSat = admToSats(amount);
      }

      if (!isIntegerAmount(amountInSat)) {
        return badParameter('amount', amount);
      }
    }

    if (!publicKey) {
      publicKey = await this.getPublicKey(address);
    }

    if (!publicKey) {
      return {
        success: false,
        errorMessage: `Unable to get public key for ${addressOrPublicKey}. It is necessary for sending an encrypted message. Account may be uninitialized (https://medium.com/adamant-im/chats-and-uninitialized-accounts-in-adamant-5035438e2fcd), or network error`,
      };
    }

    const keyPair = createKeypairFromPassphrase(passphrase);
    const encryptedMessage = encodeMessage(message, keyPair, publicKey);

    const data = {
      ...encryptedMessage,
      keyPair,
      recipientId: address,
      message_type: type,
      amount: amountInSat,
    };

    const transaction = createChatTransaction(data);

    return this.post('transactions/process', {
      transaction,
    });
  }

  /**
   * Send tokens to an account
   */
  sendTokens(
    passphrase: string,
    addressOrPublicKey: string,
    amount: number,
    isAmountInADM = true,
  ) {
    if (!isPassphrase(passphrase)) {
      return badParameter('passphrase');
    }

    let address: AdamantAddress;

    if (isAdmAddress(addressOrPublicKey)) {
      address = addressOrPublicKey;
    } else {
      if (!isAdmPublicKey(addressOrPublicKey)) {
        return badParameter('addressOrPublicKey', addressOrPublicKey);
      }

      try {
        address = createAddressFromPublicKey(addressOrPublicKey);
      } catch {
        return badParameter('addressOrPublicKey', addressOrPublicKey);
      }
    }

    let amountInSat = amount;

    if (isAmountInADM) {
      amountInSat = admToSats(amount);
    }

    if (!isIntegerAmount(amountInSat)) {
      return badParameter('amount', amount);
    }

    const keyPair = createKeypairFromPassphrase(passphrase);

    const data = {
      keyPair,
      recipientId: address,
      amount: amountInSat,
    };

    const transaction = createSendTransaction(data);

    return this.post('transactions/process', {
      transaction,
    });
  }

  /**
   * Vote for specific delegates
   *
   * @param passphrase Account's passphrase
   * @param votes Array with public keys. For upvote, add leading `+` to delegate's public key. For downvote, add leading `-` to delegate's public key.
   *
   * @example
   * ```
   * voteForDelegate(
   *   'apple banana cherry date elderberry fig grape hazelnut iris juniper kiwi lemon',
   *   [
   *     '+b3d0c0b99f64d0960324089eb678e90d8bcbb3dd8c73ee748e026f8b9a5b5468',
   *     '-9ef1f6212ae871716cfa2d04e3dc5339e8fe75f89818be21ee1d75004983e2a8',
   *     '+system',
   *     '-U16615166477939602094'
   *   ]
   * )
   * ```
   */
  async voteForDelegate(passphrase: string, votes: string[]) {
    if (!isPassphrase(passphrase)) {
      return badParameter('passphrase');
    }

    const keyPair = createKeypairFromPassphrase(passphrase);

    const uniqueVotes: {
      [publicKey: string]: VoteDirection;
    } = {};

    let delegates: DelegateDto[] = [];

    for (const vote of votes) {
      const [name, direction] = parseVote(vote);

      const cachedPublicKey = publicKeysCache[name];

      if (cachedPublicKey) {
        uniqueVotes[cachedPublicKey] = direction;
        continue;
      }

      if (!isVoteDirection(direction)) {
        return badParameter('votes', vote, 'the vote should have direction');
      }

      if (isAdmVoteForAddress(vote)) {
        if (!delegates.length) {
          const response = await this.getDelegates();

          if (!response.success) {
            this.logger.warn(
              `[ADAMANT js-api] Failed to get list of delegates. ${response.errorMessage}.`,
            );

            return badParameter(
              'votes',
              vote,
              'unable to retrieve the delegates list',
            );
          }

          ({delegates} = response);
        }

        const delegate = delegates.find(delegate => delegate.address === name);

        if (!delegate) {
          return badParameter('votes', vote, 'the address is not a delegate');
        }

        const {publicKey} = delegate;

        publicKeysCache[name] = publicKey;
        uniqueVotes[publicKey] = direction;

        continue;
      }

      if (isAdmVoteForDelegateName(vote)) {
        const response = await this.getDelegate({username: name});

        if (!response.success) {
          this.logger.warn(
            `[ADAMANT js-api] Failed to get public key for ${vote}. ${response.errorMessage}.`,
          );

          return badParameter(
            'votes',
            name,
            "unable to retrieve the delegate's public key",
          );
        }

        const {publicKey} = response.delegate;

        publicKeysCache[name] = publicKey;
        uniqueVotes[publicKey] = direction;

        continue;
      }

      if (!isAdmVoteForPublicKey(vote)) {
        return badParameter(
          'votes',
          name,
          "the vote doesn't look like public key, address or delegate name",
        );
      }

      uniqueVotes[name] = direction;
    }

    const data = {
      keyPair,
      votes: Object.keys(uniqueVotes).map(
        name => `${uniqueVotes[name]}${name}`,
      ),
    };

    const transaction = createVoteTransaction(data);

    return this.post('accounts/delegates', transaction);
  }

  /**
   * Get account information by ADAMANT address or Public Key
   */
  async getAccountInfo(
    options: AddressOrPublicKeyObject,
  ): Promise<AdamantApiResult<GetAccountInfoResponseDto>> {
    return this.get('accounts', options);
  }

  /**
   * Get account balance
   */
  async getAccountBalance(address: string) {
    return this.get<GetAccountBalanceResponseDto>('accounts/getBalance', {
      address,
    });
  }

  /**
   * Get block information by ID
   */
  async getBlock(id: string) {
    return this.get<GetBlockInfoResponseDto>('blocks/get', {id});
  }

  /**
   * Get list of blocks
   */
  async getBlocks(options?: GetBlocksOptions) {
    return this.get<GetBlocksResponseDto>('blocks', options);
  }

  /**
   * Get list of Chats
   */
  async getChats(
    address: string,
    options?: TransactionQuery<ChatroomsOptions>,
  ) {
    this.warnDeprecatedDirectTransferFilter(options);
    return this.get<GetChatRoomsResponseDto>(
      `chatrooms/${address}`,
      transformTransactionQuery(options),
    );
  }

  /**
   * Get messages between two accounts
   */
  async getChatMessages(
    address1: string,
    address2: string,
    query?: TransactionQuery<ChatroomsOptions>,
  ) {
    this.warnDeprecatedDirectTransferFilter(query);
    return this.get<GetChatMessagesResponseDto>(
      `chatrooms/${address1}/${address2}`,
      transformTransactionQuery(query),
    );
  }

  /**
   * Gets chat transactions through the legacy `/api/chats/get` endpoint.
   * @deprecated Use {@link getChats} or {@link getChatMessages} instead.
   */
  async getChatTransactions(options?: TransactionQuery<ChatroomsOptions>) {
    this.warnDeprecatedDirectTransferFilter(options);
    return this.get<GetChatTransactionsResponseDto>(
      'chats/get',
      transformTransactionQuery(options),
    );
  }

  /**
   * Retrieves list of registered ADAMANT delegates
   */
  async getDelegates(options?: GetDelegatesOptions) {
    return this.get<GetDelegatesResponseDto>('delegates', options);
  }

  /**
   * Get delegate info by `username` or `publicKey`
   */
  async getDelegate(options: DelegateLookupOptions) {
    return this.get<GetDelegateResponseDto>('delegates/get', options);
  }

  /**
   * Search delegates by `username`
   *
   * @param q - username
   */
  async searchDelegates(q: string) {
    return this.get<SearchDelegateResponseDto>('delegates/search', {q});
  }

  /**
   * Get total count of delegates
   */
  async getDelegatesCount() {
    return this.get<GetDelegatesCountResponseDto>('delegates/count');
  }

  /**
   * Get forging activity of a delegate
   */
  async getDelegateStats(generatorPublicKey: string) {
    return this.get<GetDelegateStatsResponseDto>(
      'delegates/forging/getForgedByAccount',
      {generatorPublicKey},
    );
  }

  /**
   * Returns list of next forgers
   *
   * @param limit count to retrieve
   */
  async getNextForgers(limit?: number) {
    return this.get<GetNextForgersResponseDto>('delegates/getNextForgers', {
      limit,
    });
  }

  /**
   * Gets list of delegate's voters
   *
   * @param publicKey representing delegate's publicKey
   */
  async getVoters(publicKey: string) {
    return this.get<GetVotersResponseDto>('delegates/voters', {publicKey});
  }

  /**
   * Gets current votes of specific ADAMANT account
   *
   * @param address address of the account to get votes
   */
  async getVoteData(address: string) {
    return this.get<GetAccountVotesResponseDto>('accounts/delegates', {
      address,
    });
  }

  /**
   * Gets list of connected peer nodes
   */
  async getPeers(options?: GetPeersOptions) {
    return this.get<GetPeersResponseDto>('peers', options);
  }

  /** Finds a peer known to the active node. */
  async getPeer(ip: string, port: number) {
    return this.get<GetPeerInfoResponseDto>('peers/get', {ip, port});
  }

  /**
   * Gets loading status
   */
  async getLoadingStatus() {
    return this.get<GetLoadingStatusResponseDto>('loader/status');
  }

  /**
   * Gets information on node's sync process with other peers
   */
  async getSyncStatus() {
    return this.get<GetSyncStatusResponseDto>('loader/status/sync');
  }

  /**
   * Checks if the connected node is alive
   */
  async getPingStatus() {
    return this.get<GetPingStatusResponseDto>('loader/status/ping');
  }

  /**
   * Gets node's software information
   */
  async getNodeVersion() {
    return this.get<GetNodeVersionResponseDto>('peers/version');
  }

  /**
   * Broadhash is established as an aggregated rolling hash of the past five blocks present in the database.
   */
  async getBroadhash() {
    return this.get<GetBroadhashResponseDto>('blocks/getBroadhash');
  }

  /**
   * Returns time when blockchain epoch starts. Value `2017-09-02T17:00:00.000Z` is for mainnet.
   */
  async getEpoch() {
    return this.get<GetEpochResponseDto>('blocks/getEpoch');
  }

  /**
   * Returns current node's blockchain height
   */
  async getHeight() {
    return this.get<GetHeightResponseDto>('blocks/getHeight');
  }

  /**
   * Returns current fee value for `type 0` (token transfer) transactions.
   * Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000).
   */
  async getFee() {
    return this.get<GetTokenTransferFeeResponseDto>('blocks/getFee');
  }

  /**
   * Returns current fee values for different transaction types
   */
  async getFees() {
    return this.get<GetTransactionTypesFeesResponseDto>('blocks/getFees');
  }

  /**
   * The nethash describes e.g. the Mainnet or the Testnet, that the node is connecting to.
   */
  async getNethash() {
    return this.get<GetNethashResponseDto>('blocks/getNethash');
  }

  /**
   * Return current slot height, which determines reward a delegate will get for forging a block.
   */
  async getMilestone() {
    return this.get<GetMilestoneResponseDto>('blocks/getMilestone');
  }

  /**
   * Returns reward — the reward a delegate will get for forging a block.
   * Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000). Depends on the slot height.
   */
  async getReward() {
    return this.get<GetRewardResponseDto>('blocks/getReward');
  }

  /**
   * Returns total current supply of ADM tokens in network. Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000).
   * Total supply increases with every new forged block.
   */
  async getSupply() {
    return this.get<GetTokensTotalSupplyResponseDto>('blocks/getSupply');
  }

  /**
   * Returns blockchain network information in a single request
   */
  async getStatus() {
    return this.get<GetNetworkInfoResponseDto>('blocks/getStatus');
  }

  /**
   * Returns both ADAMANT blockchain network information and Node information in a single request.
   */
  async getNodeStatus() {
    return this.get<GetNodeStatusResponseDto>('node/status');
  }

  /** Fetches ADAMANT KVS transactions. */
  async getKVS(options?: TransactionQuery<KVSOptions>) {
    return this.get<GetKVSResponseDto>(
      'states/get',
      transformTransactionQuery(options),
    );
  }

  /** Broadcasts an already-created and signed KVS transaction. */
  async setKVS(request: SetKVSRequestBody) {
    return this.post<SetKVSResponseDto>('states/store', request);
  }

  /**
   * Returns list of transactions
   */
  async getTransactions(options?: TransactionQuery<TransactionsOptions>) {
    return this.get<GetTransactionsResponseDto>(
      'transactions',
      transformTransactionQuery(options),
    );
  }

  /** Broadcasts an already-created and signed transaction. */
  async sendTransaction(request: RegisterTransactionRequestBody) {
    return this.post<RegisterTransactionResponseDto>('transactions', request);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(
    id: string,
    options?: TransactionQuery<TransactionsOptions>,
  ) {
    return this.get<GetTransactionByIdResponseDto>('transactions/get', {
      id,
      ...transformTransactionQuery(options),
    });
  }

  /**
   * Get `confirmed`, `unconfirmed` and `queued` transactions count
   */
  async getTransactionsCount() {
    return this.get<GetTransactionsCountResponseDto>('transactions/count');
  }

  /**
   * Get queued transactions count
   */
  async getQueuedTransactions() {
    return this.get<GetQueuedTransactionsResponseDto>('transactions/queued');
  }

  /**
   * Get queued transaction by ID
   */
  async getQueuedTransaction(id: string) {
    return this.get<GetQueuedTransactionsResponseDto>(
      'transactions/queued/get',
      {id},
    );
  }

  /**
   * Get unconfirmed transactions
   */
  async getUnconfirmedTransactions() {
    return this.get<GetUnconfirmedTransactionsResponseDto>(
      'transactions/unconfirmed',
    );
  }

  /**
   * Get unconfirmed transaction by ID
   */
  async getUnconfirmedTransaction(id: string) {
    return this.get<GetUnconfirmedTransactionByIdResponseDto>(
      'transactions/unconfirmed/get',
      {id},
    );
  }

  private warnDeprecatedDirectTransferFilter(
    options?: TransactionQuery<ChatroomsOptions>,
  ) {
    if (
      options?.withoutDirectTransfers !== undefined ||
      options?.and?.withoutDirectTransfers !== undefined ||
      options?.or?.withoutDirectTransfers !== undefined
    ) {
      this.logger.warn(
        '[ADAMANT js-api] `withoutDirectTransfers` is deprecated. Use `includeDirectTransfers` instead.',
      );
    }
  }
}

export * from './generated';
export * from './utils';
