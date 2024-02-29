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
  GetAccountBalanceResponseDto,
  GetAccountInfoResponseDto,
  GetAccountPublicKeyResponseDto,
  GetAccountVotesResponseDto,
  GetBlockInfoResponseDto,
  GetBlocksResponseDto,
  GetBroadhashResponseDto,
  GetChatMessagesResponseDto,
  GetChatRoomsResponseDto,
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
  SearchDelegateResponseDto,
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

export type TransactionQuery<T extends object> = Partial<T> & {
  or?: Partial<T>;
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

export interface TransactionQueryParameters {
  blockId?: number;
  fromHeight?: number;
  toHeight?: number;
  minAmount?: number;
  maxAmount?: number;
  senderId?: string;
  recipientId?: string;
  inId?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
}

// parameters that available for /api/chatrooms
export interface ChatroomsOptions extends TransactionQueryParameters {
  type?: number;
  withoutDirectTransfers?: boolean;
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
    retryNo = 1
  ): Promise<AdamantApiResult<T>> {
    const {logger, maxRetries} = this;

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
        const logMessage = `[ADAMANT js-api] Get-request: Request to ${url} failed with ${error
          .response?.status} status code, ${error}${
          error.response?.data
            ? '. Message: ' + error.response.data.toString().trim()
            : ''
        }. Try ${retryNo} of ${maxRetries}.`;

        if (retryNo <= maxRetries) {
          logger.log(`${logMessage} Retrying…`);

          await this.updateNodes();
          return this.request<T>(method, endpoint, data, retryNo + 1);
        }

        logger.warn(`${logMessage} No more attempts, returning error.`);

        return {
          success: false,
          errorMessage: `${error}`,
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
   * @details `endpoint` should be in `'accounts/getPublicKey'` format, excluding `'/api/'`
   */
  async get<T>(endpoint: string, params?: unknown) {
    return this.request<T>('GET', endpoint, params);
  }

  /**
   * Makes POST request to ADAMANT network.
   *
   * @details `endpoint` should be in `'accounts/getPublicKey'` format, excluding `'/api/'`
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
      }
    );

    if (response.success) {
      const {publicKey} = response;

      publicKeysCache[address] = publicKey;
      return publicKey;
    }

    this.logger.warn(
      `[ADAMANT js-api] Failed to get public key for ${address}. ${response.errorMessage}.`
    );
    return '';
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
    isAmountInADM?: boolean
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
      } catch (error) {
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
    isAmountInADM = true
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
      } catch (error) {
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
   * @param votes Array with public keys. For upvote, add leading `+` to delegate's public key. For downvote, add leading `-` to delegate's public key.
   *
   * @example
   * ```
   * voteForDelegate([
   *   '+b3d0c0b99f64d0960324089eb678e90d8bcbb3dd8c73ee748e026f8b9a5b5468',
   *   '-9ef1f6212ae871716cfa2d04e3dc5339e8fe75f89818be21ee1d75004983e2a8'
   * ])
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

    for (const vote of votes) {
      const [name, direction] = parseVote(vote);

      const cachedPublicKey = publicKeysCache[name];

      if (cachedPublicKey) {
        uniqueVotes[cachedPublicKey] = direction;
        continue;
      }

      if (isAdmVoteForAddress(vote)) {
        const response = await this.getAccountInfo({address: name});

        if (!response.success) {
          this.logger.warn(
            `[ADAMANT js-api] Failed to get public key for ${vote}. ${response.errorMessage}.`
          );
          return badParameter('votes');
        }

        const {publicKey} = response.account;

        publicKeysCache[name] = publicKey;
        uniqueVotes[publicKey] = direction;

        continue;
      }

      if (isAdmVoteForDelegateName(name)) {
        const response = await this.getDelegate({username: name});

        if (!response.success) {
          this.logger.warn(
            `[ADAMANT js-api] Failed to get public key for ${vote}. ${response.errorMessage}.`
          );
          return badParameter('votes');
        }

        const {publicKey} = response.delegate;

        publicKeysCache[name] = publicKey;
        uniqueVotes[publicKey] = direction;

        continue;
      }

      if (!isAdmVoteForPublicKey(name)) {
        return badParameter('votes');
      }

      uniqueVotes[name] = direction;
    }

    const data = {
      keyPair,
      votes: Object.keys(uniqueVotes).map(
        name => `${uniqueVotes[name]}${name}`
      ),
    };

    const transaction = createVoteTransaction(data);

    return this.post('accounts/delegates', transaction);
  }

  /**
   * Get account information by ADAMANT address or Public Key
   */
  async getAccountInfo(
    options: AddressOrPublicKeyObject
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
    options?: TransactionQuery<ChatroomsOptions>
  ) {
    return this.get<GetChatRoomsResponseDto>(
      `chatrooms/${address}`,
      transformTransactionQuery(options)
    );
  }

  /**
   * Get messages between two accounts
   */
  async getChatMessages(
    address1: string,
    address2: string,
    query?: TransactionQuery<ChatroomsOptions>
  ) {
    return this.get<GetChatMessagesResponseDto>(
      `chatrooms/${address1}/${address2}`,
      transformTransactionQuery(query)
    );
  }

  /**
   * Retrieves list of registered ADAMANT delegates
   */
  async getDelegates(options: GetDelegatesOptions) {
    return this.get<GetDelegatesResponseDto>('delegates', options);
  }

  /**
   * Get delegate info by `username` or `publicKey`
   */
  async getDelegate(options: UsernameOrPublicKeyObject) {
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
      {generatorPublicKey}
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
  async getPeers() {
    return this.get<GetPeersResponseDto>('peers');
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

  /**
   * Returns list of transactions
   */
  async getTransactions(options?: TransactionQuery<TransactionsOptions>) {
    return this.get<GetTransactionsResponseDto>(
      'transactions',
      transformTransactionQuery(options)
    );
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(
    id: string,
    options?: TransactionQuery<TransactionsOptions>
  ) {
    return this.get<GetTransactionByIdResponseDto>('transactions/get', {
      id,
      ...transformTransactionQuery(options),
    });
  }

  /**
   * Get `confirmed`, `uncofirmed` and `queued` transactions count
   *
   * @nav Transactions
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
      {id}
    );
  }

  /**
   * Get unconfirmed transactions
   */
  async getUnconfirmedTransactions() {
    return this.get<GetUnconfirmedTransactionsResponseDto>(
      'transactions/unconfirmed'
    );
  }

  /**
   * Get unconfirmed transaction by ID
   */
  async getUnconfirmedTransaction(id: string) {
    return this.get<GetUnconfirmedTransactionByIdResponseDto>(
      'transactions/unconfirmed/get',
      {id}
    );
  }
}

export * from './generated';
export * from './utils';
