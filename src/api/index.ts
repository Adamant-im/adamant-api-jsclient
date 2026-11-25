/**
 * ADM HTTP client (`AdamantApi`): resilient node access with health checks,
 * retries, and failover; typed request options; and the generated ADAMANT API
 * DTO types.
 *
 * @module
 */

import axios, {AxiosError} from 'axios';
import {NodeManager, NodeManagerOptions} from '../helpers/healthCheck';
import {Logger, type CustomLogger, type LogLevelInput} from '../helpers/logger';
import {getResponseHeader, parseRetryAfterMs} from '../helpers/rateLimit';
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
  GetTopAccountsResponseDto,
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
  formatPublicKeyVerificationReason,
  isValidEd25519PublicKey,
  verifyPublicKeyForAddress,
  type PublicKeyVerificationFailureReason,
} from '../helpers/publicKey';
import {
  cacheVerifiedDelegateAddressPublicKey,
  cacheVerifiedDelegatePublicKey,
  cacheVerifiedPublicKey,
  getVerifiedCachedDelegateAddressPublicKey,
  getVerifiedCachedDelegatePublicKey,
  getVerifiedCachedPublicKey,
} from './publicKeyCache';
import {
  type VoteDirection,
  getUnsupportedTransactionQueryControls,
  getUnsupportedTransactionQueryControlWarning,
  hasMixedTransactionQueryGroups,
  transformTransactionQuery,
  unsupportedOrQueryResult,
  type TransactionQueryEndpoint,
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
  UsernameObject | PublicKeyObject | AddressObject;

/**
 * A transaction query.
 *
 * `/api/transactions` (`getTransactions`, `getTransaction`) prefixes top-level
 * filter conditions with `and:`, so every condition must match. The raw node
 * API defaults that endpoint to `or`. Wrap fields in `or` to opt into `or`.
 * An explicit `and` wrapper is also supported. Mixed operators are flattened
 * in object-key order without parentheses and trigger a runtime warning at
 * most once per client instance.
 *
 * `/api/states/get`, `/api/chats/get`, and `/api/chatrooms` combine plain
 * filter names with `and`. Those methods send plain names. An explicit `and`
 * wrapper is flattened to the same plain names. An `or` wrapper or pre-prefixed
 * `and:` / `or:` filter key is rejected: pre-v0.11.0 nodes ignore `and:` and
 * `or:` prefixes on these endpoints and return unfiltered data
 * (Adamant-im/adamant#277), while ADAMANT Node v0.11.0+ strictly rejects `or:`
 * prefixes (Adamant-im/adamant#294). Plain names are the documented form across
 * every node version.
 *
 * Control and pagination parameters are not filters. Each endpoint forwards
 * only the controls it supports; known controls from another endpoint are
 * stripped at runtime and warn once per endpoint and parameter.
 *
 * @see https://docs.adamant.im/api/transactions-query-language.html#combine-filters-and-options
 */
export type TransactionQuery<T extends object> = Partial<T> & {
  /**
   * Conditions prefixed with `or` on `/api/transactions`. This object does not
   * create parentheses. Chat and KVS endpoints reject this wrapper.
   */
  or?: Partial<T>;
  /**
   * Conditions combined with `and`. On `/api/transactions` each field is sent
   * with an `and:` prefix. On chat and KVS endpoints the wrapper is flattened
   * to plain filter names.
   */
  and?: Partial<T>;
};

export interface GetBlocksOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  generatorPublicKey?: string;
  numberOfTransactions?: number;
  totalAmount?: number | string;
  totalFee?: number | string;
  reward?: number;
  previousBlock?: string;
  height?: number;
}

export interface GetDelegatesOptions {
  /** Number of delegates to retrieve. Defaults to `101`. */
  limit?: number;
  /** Number of delegates to skip. Defaults to `0`. */
  offset?: number;
  /**
   * Sort field and direction, for example `rank:asc`.
   *
   * Supported fields are `approval`, `productivity`, `rate`, `rank`, `vote`,
   * `username`, `address`, and `publicKey`.
   */
  orderBy?: string;
}

export interface SearchDelegatesOptions {
  /** Maximum number of matches to return, from `1` to `1000`. */
  limit?: number;
  /**
   * Sort field and direction, for example `username:asc`.
   *
   * Supported fields are `username`, `address`, `publicKey`, `vote`,
   * `missedblocks`, `producedblocks`, `approval`, `productivity`, `voters_cnt`,
   * and `register_timestamp`.
   */
  orderBy?: string;
}

export interface GetDelegateStatsOptions {
  /** Inclusive interval start as a Unix timestamp in seconds. */
  start?: number;
  /** Inclusive interval end as a Unix timestamp in seconds. */
  end?: number;
}

export interface GetPeersOptions {
  /** Number of peers to retrieve, from `1` to `100`. */
  limit?: number;
  /** Number of peers to skip. Defaults to `0`. */
  offset?: number;
  /**
   * Sort field and direction, for example `height:desc`.
   *
   * Supported fields are `ip`, `port`, `state`, `os`, `version`, `broadhash`,
   * `height`, and `nonce`.
   */
  orderBy?: string;
  /** Filter by operating system. */
  os?: string;
  /** Filter by IP address. */
  ip?: string;
  /** Filter by node port, from `1` to `65535`. */
  port?: number;
  /** Filter by peer state: banned, disconnected, or connected. */
  state?: 0 | 1 | 2;
  /** Filter by semantic ADAMANT Node version. */
  version?: string;
  /** Filter by hexadecimal broadhash. */
  broadhash?: string;
  /** Filter by blockchain height. */
  height?: number;
}

export interface GetTopAccountsOptions {
  /** Number of accounts to return. Use `0` for count-only metadata. */
  limit?: number;
  offset?: number;
  isDelegate?: 0 | 1;
}

export interface PooledTransactionsOptions {
  /** Filter by the sender's 32-byte hexadecimal public key. */
  senderPublicKey?: string;
  /** Filter by recipient ADAMANT address. */
  address?: string;
}

/**
 * Query parameters shared by transaction-style endpoints, led by
 * `/api/transactions`.
 *
 * Two things to keep in mind:
 *
 * 1. **Filter combination.** `/api/transactions` sends top-level filters with
 *    an `and:` prefix. Chat and KVS endpoints send plain names, which nodes
 *    combine with `and`. See {@link TransactionQuery}. Control and pagination
 *    fields (`limit`, `offset`, `orderBy`, `returnUnconfirmed`) are never
 *    treated as filters.
 * 2. **Endpoint support varies.** Pre-v0.11.0 nodes silently ignored unknown
 *    query fields on chat and KVS endpoints; starting in ADAMANT Node v0.11.0,
 *    `/api/chatrooms/*`, `/api/chats/get`, and `/api/states/get` strictly
 *    reject unsupported parameters (Adamant-im/adamant#294). Use the
 *    endpoint-specific option interfaces ({@link ChatroomsOptions},
 *    {@link ChatTransactionsOptions}, {@link KVSOptions},
 *    {@link TransactionsOptions}) to catch unsupported filters at compile time.
 *
 * @see https://docs.adamant.im/api/transactions-query-language.html
 * @see https://github.com/Adamant-im/adamant/blob/dev/modules/transactions.js
 */
export interface TransactionQueryParameters {
  returnUnconfirmed?: 1 | 0;
  blockId?: string;
  fromHeight?: number;
  toHeight?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
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

/**
 * Options for the chatroom endpoints: `/api/chatrooms/{address}` (`getChats`)
 * and `/api/chatrooms/{ownAddress}/{partnerAddress}` (`getChatMessages`).
 *
 * The SDK sends these fields under their plain names. `or` is rejected because
 * these endpoints have no `or` combiner. Starting in ADAMANT Node v0.11.0,
 * unsupported query fields (including `fromHeight`, `toHeight`, and query
 * `userId`) are strictly rejected (Adamant-im/adamant#294).
 */
export interface ChatroomsOptions {
  type?: number;
  senderId?: string;
  recipientId?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  returnUnconfirmed?: 1 | 0;
  /**
   * @deprecated Removed in ADAMANT Node v0.11.0: the account address belongs in
   * the `/api/chatrooms/{address}` URL path and passing `userId` as a query
   * parameter is rejected by v0.11.0+ nodes. The SDK strips this parameter and
   * warns once.
   */
  userId?: string;
  includeDirectTransfers?: boolean | 1 | 0;
  /** @deprecated Use `includeDirectTransfers` instead. */
  withoutDirectTransfers?: boolean | 1 | 0;
}

/**
 * Options for the legacy `/api/chats/get` endpoint (`getChatTransactions`).
 *
 * Supports all {@link ChatroomsOptions} filters plus `fromHeight`, `toHeight`
 * (applied only by ADAMANT Node v0.11.0+; set `minVersion: '0.11.0'` when
 * relying on it), `inId`, and `isIn`.
 */
export interface ChatTransactionsOptions extends ChatroomsOptions {
  fromHeight?: number;
  /**
   * Upper block height bound (inclusive).
   *
   * Applied only by ADAMANT Node v0.11.0+. Older nodes silently ignore this
   * parameter and may return newer transactions with `success: true`. Set
   * `minVersion: '0.11.0'` when your application relies on `toHeight`.
   */
  toHeight?: number;
  inId?: string;
  isIn?: string;
}

/**
 * Options for `/api/transactions` (`getTransactions`, `getTransaction`). This
 * is the most permissive endpoint: it applies the full filter set, including
 * the amount filters (`minAmount` / `maxAmount`) that the chat and KVS
 * endpoints do not support.
 */
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
  fromUnixTime?: number;
  toUnixTime?: number;
  // Amount filters are supported only by `/api/transactions`, not by
  // `/api/chats/get`, `/api/chatrooms`, or `/api/states/get`.
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Options for `/api/states/get` (`getKVS`).
 *
 * The SDK sends these fields under their plain names. `or` and pre-prefixed
 * `and:` / `or:` filter keys are rejected because this endpoint has no `or`
 * combiner. Starting in ADAMANT Node v0.11.0, `toHeight` is enforced
 * (`b_height <= toHeight`), `keyIds` validates 20-char KVS keys, and
 * unsupported fields such as `blockId`, `recipientId`, or misspelled `keysIds`
 * are strictly rejected (Adamant-im/adamant#294). Pre-v0.11.0 nodes silently
 * ignore `toHeight`, so set `minVersion: '0.11.0'` if your application relies
 * on an upper height bound.
 */
export interface KVSOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  returnUnconfirmed?: 1 | 0;
  fromHeight?: number;
  /**
   * Upper block height bound (inclusive).
   *
   * Applied only by ADAMANT Node v0.11.0+. Older nodes silently ignore this
   * parameter and may return newer records with `success: true`. Set
   * `minVersion: '0.11.0'` when your application relies on `toHeight`.
   */
  toHeight?: number;
  senderId?: string;
  senderIds?: string[];
  key?: string;
  keyIds?: string[];
  type?: number;
}

/** Request options for {@link AdamantApi.getKVS}. */
export interface GetKVSRequestOptions {
  /**
   * HTTP method for `/api/states/get`. Defaults to `'GET'`.
   * Use `'POST'` when large `keyIds` or `senderIds` filters exceed URL length
   * limits.
   */
  method?: 'GET' | 'POST';
}

export interface AdamantApiOptions extends NodeManagerOptions {
  nodes: string[];

  maxRetries?: number;
  timeout?: number;

  logger?: CustomLogger;
  /**
   * Logging threshold. Only `none` disables logging. Unknown string values,
   * including `debug` and `trace`, fall back to the most verbose `log` level.
   */
  logLevel?: LogLevelInput;
}

const formatSendMessageVerificationError = (
  recipient: string,
  reason: PublicKeyVerificationFailureReason,
) =>
  `Unable to verify recipient public key for ${recipient}. The ${formatPublicKeyVerificationReason(reason)}.`;

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

const MAX_RATE_LIMIT_RETRY_DELAY_MS = 10_000;
const DEFAULT_RATE_LIMIT_RETRY_DELAY_MS = 1_000;
const RATE_LIMIT_JITTER_MS = 250;

const wait = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

const ensureTrailingPeriod = (message: string) =>
  message.endsWith('.') ? message : `${message}.`;

const normalizeApiResponse = <T>(data: unknown): AdamantApiResult<T> => {
  if (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    data.success === false
  ) {
    return {
      success: false,
      errorMessage:
        responseErrorMessage(data) ||
        'ADAMANT Node returned an unsuccessful response without an error message',
    };
  }

  return data as AdamantApiResult<T>;
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
  private hasWarnedAboutMixedQuery = false;
  private readonly warnedUnsupportedControls = new Set<string>();

  constructor(options: AdamantApiOptions) {
    const customLogger = new Logger(options.logLevel, options.logger);

    super(customLogger, options);

    this.maxRetries = options.maxRetries ?? DEFAULT_GET_REQUEST_RETRIES;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data: unknown,
    options: {retryNo?: number; idempotent?: boolean} = {},
  ): Promise<AdamantApiResult<T>> {
    const {logger, maxRetries} = this;
    const retryNo = options.retryNo ?? 1;
    const idempotent = options.idempotent ?? method === 'GET';

    if (!this.hasCompatibleNode) {
      const minVersion = this.options.minVersion;
      return {
        success: false,
        errorMessage: `No compatible ADAMANT nodes are available${minVersion ? `. Minimum required version is ${minVersion}` : ''}.`,
      };
    }

    const targetNode = this.node;
    const url = `${targetNode}/api/${endpoint}`;

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

      return normalizeApiResponse<T>(response.data);
    } catch (error) {
      if (error instanceof AxiosError) {
        const {response} = error;
        const isRateLimited = response?.status === 429;
        const rateLimitScope = isRateLimited
          ? getResponseHeader(response.headers, 'ratelimit-scope')
          : undefined;
        const retryAfterMs = isRateLimited
          ? parseRetryAfterMs(response.headers)
          : undefined;
        const rateLimitDetails = [
          rateLimitScope ? `scope: ${rateLimitScope}` : '',
          retryAfterMs !== undefined
            ? `retry after: ${Math.ceil(retryAfterMs / 1000)}s`
            : '',
        ].filter(Boolean);
        const rateLimitSuffix = rateLimitDetails.length
          ? ` (${rateLimitDetails.join(', ')})`
          : '';

        const nodeStatus = response?.status
          ? `Request to ${url} failed with HTTP ${response.status}${rateLimitSuffix}`
          : `Request to ${url} failed`;
        const errorDetails = formatAxiosError(error);

        const responseMessage = responseErrorMessage(response?.data);
        const logMessage = `[ADAMANT js-api] ${method} request: ${nodeStatus}. ${errorDetails}${
          responseMessage ? '. Message: ' + responseMessage : ''
        }.`;

        const rateLimitResultMetadata = isRateLimited
          ? {
              status: 429,
              ...(retryAfterMs !== undefined ? {retryAfterMs} : {}),
              ...(rateLimitScope !== undefined ? {rateLimitScope} : {}),
            }
          : {};

        if (isRateLimited) {
          this.markNodeRateLimited(
            targetNode,
            retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_DELAY_MS * retryNo,
          );
        }

        // A received HTTP response proves that the node is reachable. Retrying a
        // rejected non-idempotent POST can duplicate a transaction, while 4xx
        // (other than idempotent 429 rate limits) and structured API errors are
        // not recoverable by switching nodes. Unstructured 5xx failures and 429
        // rate limits on idempotent reads may safely fail over to another node
        // (or back off on 429).
        const shouldRetry =
          !response ||
          (idempotent &&
            ((response.status >= 500 && responseMessage === '') ||
              isRateLimited));

        if (shouldRetry && retryNo <= maxRetries) {
          if (isRateLimited) {
            if (this.node !== targetNode) {
              logger.log(
                `${logMessage} Try ${retryNo}/${maxRetries}. Retrying on ${this.node}…`,
              );
              return this.request<T>(method, endpoint, data, {
                retryNo: retryNo + 1,
                idempotent,
              });
            }

            if (this.options.nodes.length > 1) {
              if (!this.switchNodeFromCache(targetNode)) {
                await this.updateNodes(false, targetNode);
              }

              if (this.node !== targetNode) {
                logger.log(
                  `${logMessage} Try ${retryNo}/${maxRetries}. Retrying on ${this.node}…`,
                );
                return this.request<T>(method, endpoint, data, {
                  retryNo: retryNo + 1,
                  idempotent,
                });
              }
            }

            const baseDelayMs =
              retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_DELAY_MS * retryNo;
            if (baseDelayMs > MAX_RATE_LIMIT_RETRY_DELAY_MS) {
              logger.warn(
                `${logMessage} Retry delay exceeds bounded wait (${MAX_RATE_LIMIT_RETRY_DELAY_MS}ms), returning error.`,
              );
              return {
                success: false,
                errorMessage: ensureTrailingPeriod(
                  responseMessage || errorDetails,
                ),
                ...rateLimitResultMetadata,
              };
            }

            const jitterMs =
              baseDelayMs > 0
                ? Math.min(
                    RATE_LIMIT_JITTER_MS,
                    MAX_RATE_LIMIT_RETRY_DELAY_MS - baseDelayMs,
                  ) * Math.random()
                : 0;
            const waitMs = Math.round(baseDelayMs + jitterMs);

            logger.log(
              `${logMessage} Try ${retryNo}/${maxRetries}. Waiting ${waitMs}ms before retrying…`,
            );
            if (waitMs > 0) {
              await wait(waitMs);
            }

            return this.request<T>(method, endpoint, data, {
              retryNo: retryNo + 1,
              idempotent,
            });
          }

          if (this.node !== targetNode) {
            logger.log(
              `${logMessage} Try ${retryNo}/${maxRetries}. Retrying on ${this.node}…`,
            );
            return this.request<T>(method, endpoint, data, {
              retryNo: retryNo + 1,
              idempotent,
            });
          }

          logger.log(`${logMessage} Try ${retryNo}/${maxRetries}. Retrying…`);

          await this.updateNodes(false, targetNode);
          return this.request<T>(method, endpoint, data, {
            retryNo: retryNo + 1,
            idempotent,
          });
        }

        logger.warn(`${logMessage} No more attempts, returning error.`);

        return {
          success: false,
          errorMessage: ensureTrailingPeriod(responseMessage || errorDetails),
          ...rateLimitResultMetadata,
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
   * Gets an account's Ed25519 public key and verifies locally that it is
   * well-formed and derives `address` before caching or returning it.
   *
   * Returns an empty string when the key cannot be retrieved or fails
   * verification.
   */
  async getPublicKey(address: AdamantAddress) {
    if (!isAdmAddress(address)) {
      this.logger.warn(
        `[ADAMANT js-api] Rejected public key lookup for invalid ADM address ${address}.`,
      );
      return '';
    }

    const cached = getVerifiedCachedPublicKey(address, reason => {
      this.logger.warn(
        `[ADAMANT js-api] Discarded cached public key for ${address}: ${formatPublicKeyVerificationReason(reason)}.`,
      );
    });
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
      const verification = cacheVerifiedPublicKey(address, response.publicKey);
      if (verification.valid) {
        return verification.publicKey;
      }

      this.logger.warn(
        `[ADAMANT js-api] Rejected public key for ${address}: ${formatPublicKeyVerificationReason(verification.reason)}.`,
      );
      return '';
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
   * Encrypts a message, creates a Message transaction, signs it, and broadcasts
   * it to the ADAMANT network.
   *
   * Accepts either a recipient ADM address or a full 32-byte hex Ed25519 public
   * key. When resolving a recipient address, the SDK verifies that the public
   * key is well-formed and locally derives the recipient address before
   * encrypting or broadcasting.
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
      if (!isValidEd25519PublicKey(addressOrPublicKey)) {
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
      return badParameter('message', message, result.errorMessage);
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
        errorMessage: `Unable to get a verified public key for ${addressOrPublicKey}. It is necessary for sending an encrypted message. Account may be uninitialized (https://medium.com/adamant-im/chats-and-uninitialized-accounts-in-adamant-5035438e2fcd), a network error occurred, or the node-supplied key failed local verification`,
      };
    }

    const verification = verifyPublicKeyForAddress(address, publicKey);
    if (!verification.valid) {
      this.logger.warn(
        `[ADAMANT js-api] Rejected recipient public key for ${address}: ${formatPublicKeyVerificationReason(verification.reason)}.`,
      );
      return {
        success: false,
        errorMessage: formatSendMessageVerificationError(
          addressOrPublicKey,
          verification.reason,
        ),
      };
    }

    const keyPair = createKeypairFromPassphrase(passphrase);
    const encryptedMessage = encodeMessage(
      message,
      keyPair,
      verification.publicKey,
    );

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
   * Vote for specific delegates.
   *
   * Address-based votes verify locally that the delegate's public key derives
   * the voted ADM address before caching or signing. Username-based votes
   * verify that the node's `{address, publicKey}` response is self-consistent
   * (`publicKey` derives `address`), which does not prove that the username
   * belongs to that delegate.
   *
   * @param passphrase Account's passphrase
   * @param votes Array with public keys, ADM addresses, or delegate names. For upvote, add leading `+`. For downvote, add leading `-`.
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

      if (!isVoteDirection(direction)) {
        return badParameter('votes', vote, 'the vote should have direction');
      }

      if (isAdmVoteForAddress(vote)) {
        const cachedPublicKey = getVerifiedCachedDelegateAddressPublicKey(
          name,
          reason => {
            this.logger.warn(
              `[ADAMANT js-api] Discarded cached delegate public key for ${name}: ${formatPublicKeyVerificationReason(reason)}.`,
            );
          },
        );

        if (cachedPublicKey) {
          uniqueVotes[cachedPublicKey] = direction;
          continue;
        }

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

        const verification = cacheVerifiedDelegateAddressPublicKey(
          name,
          delegate.publicKey,
        );
        if (!verification.valid) {
          this.logger.warn(
            `[ADAMANT js-api] Rejected delegate public key for ${name}: ${formatPublicKeyVerificationReason(verification.reason)}.`,
          );

          return badParameter(
            'votes',
            vote,
            formatPublicKeyVerificationReason(verification.reason),
          );
        }

        uniqueVotes[verification.publicKey] = direction;

        continue;
      }

      if (isAdmVoteForDelegateName(vote)) {
        const cachedPublicKey = getVerifiedCachedDelegatePublicKey(name, () => {
          this.logger.warn(
            `[ADAMANT js-api] Discarded cached delegate public key for ${name}: ${formatPublicKeyVerificationReason('malformed')}.`,
          );
        });

        if (cachedPublicKey) {
          uniqueVotes[cachedPublicKey] = direction;
          continue;
        }

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

        const verification = cacheVerifiedDelegatePublicKey(
          name,
          response.delegate?.publicKey,
          response.delegate?.address,
        );
        if (!verification.valid) {
          this.logger.warn(
            `[ADAMANT js-api] Rejected delegate public key for ${vote}: ${formatPublicKeyVerificationReason(verification.reason)}.`,
          );

          return badParameter(
            'votes',
            name,
            formatPublicKeyVerificationReason(verification.reason),
          );
        }

        uniqueVotes[verification.publicKey] = direction;

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
   * Gets non-zero-balance accounts ordered by balance descending.
   *
   * ADAMANT Node v0.10.2 and newer return pagination metadata and support an
   * optional delegate-status filter.
   */
  async getTopAccounts(options?: GetTopAccountsOptions) {
    return this.get<GetTopAccountsResponseDto>('accounts/top', options);
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
    const rejected = unsupportedOrQueryResult(options, 'chatrooms');
    if (rejected) {
      return rejected;
    }

    return this.get<GetChatRoomsResponseDto>(
      `chatrooms/${address}`,
      this.transformQuery(options, 'chatrooms'),
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
    const rejected = unsupportedOrQueryResult(query, 'chatrooms');
    if (rejected) {
      return rejected;
    }

    return this.get<GetChatMessagesResponseDto>(
      `chatrooms/${address1}/${address2}`,
      this.transformQuery(query, 'chatrooms'),
    );
  }

  /**
   * Gets chat transactions through the legacy `/api/chats/get` endpoint.
   * @deprecated Use {@link getChats} or {@link getChatMessages} instead.
   */
  async getChatTransactions(
    options?: TransactionQuery<ChatTransactionsOptions>,
  ) {
    this.warnDeprecatedDirectTransferFilter(options);
    const rejected = unsupportedOrQueryResult(options, 'chats');
    if (rejected) {
      return rejected;
    }

    return this.get<GetChatTransactionsResponseDto>(
      'chats/get',
      this.transformQuery(options, 'chats'),
    );
  }

  /**
   * Retrieves registered ADAMANT delegates.
   *
   * Each delegate includes `forged`, the lifetime sum of block fees and
   * rewards as a base-10 integer string in base units.
   */
  async getDelegates(options?: GetDelegatesOptions) {
    return this.get<GetDelegatesResponseDto>('delegates', options);
  }

  /**
   * Gets delegate info by `username`, `publicKey`, or `address`.
   *
   * The delegate includes `forged`, the lifetime sum of block fees and rewards
   * as a base-10 integer string in base units.
   */
  async getDelegate(options: DelegateLookupOptions) {
    return this.get<GetDelegateResponseDto>('delegates/get', options);
  }

  /**
   * Searches delegates by partial or full `username`.
   *
   * Search results include voter and registration details, but unlike the
   * delegate list and single-delegate endpoints they do not include `forged`.
   *
   * @param q - A username fragment from `1` to `20` characters.
   */
  async searchDelegates(q: string, options?: SearchDelegatesOptions) {
    return this.get<SearchDelegateResponseDto>('delegates/search', {
      ...options,
      q,
    });
  }

  /**
   * Get total count of delegates
   */
  async getDelegatesCount() {
    return this.get<GetDelegatesCountResponseDto>('delegates/count');
  }

  /**
   * Gets forging activity for a delegate, optionally within an inclusive Unix
   * timestamp interval.
   */
  async getDelegateStats(
    generatorPublicKey: string,
    options?: GetDelegateStatsOptions,
  ) {
    return this.get<GetDelegateStatsResponseDto>(
      'delegates/forging/getForgedByAccount',
      {...options, generatorPublicKey},
    );
  }

  /**
   * Returns a next-block snapshot of upcoming forger public keys.
   *
   * The node builds the entire result from the delegate schedule for
   * `currentBlock + 1`, including at round boundaries. Request a new snapshot
   * after another block is accepted.
   *
   * @param limit - Number of public keys to retrieve, from `1` to `101`.
   * Defaults to `10`.
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
   * Returns blockchain network information in a single request, including the
   * latest cumulative `consensusCodeName` active at the current height.
   */
  async getStatus() {
    return this.get<GetNetworkInfoResponseDto>('blocks/getStatus');
  }

  /**
   * Returns ADAMANT blockchain network and Node information in a single
   * request, including the effective consensus activation heights and complete
   * block reward milestone schedule.
   */
  async getNodeStatus() {
    return this.get<GetNodeStatusResponseDto>('node/status');
  }

  /**
   * Fetches ADAMANT KVS transactions from `/api/states/get`.
   *
   * Pass `{method: 'POST'}` when large `keyIds` or `senderIds` filters would
   * exceed URL length limits.
   */
  async getKVS(
    options?: TransactionQuery<KVSOptions>,
    requestOptions?: GetKVSRequestOptions,
  ) {
    const rejected = unsupportedOrQueryResult(options, 'states');
    if (rejected) {
      return rejected;
    }

    const payload = this.transformQuery(options, 'states');
    if (requestOptions?.method === 'POST') {
      return this.request<GetKVSResponseDto>('POST', 'states/get', payload, {
        idempotent: true,
      });
    }

    return this.get<GetKVSResponseDto>('states/get', payload);
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
      this.transformQuery(options, 'transactions'),
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
      ...this.transformQuery(options, 'transactions'),
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
  async getQueuedTransactions(options?: PooledTransactionsOptions) {
    return this.get<GetQueuedTransactionsResponseDto>(
      'transactions/queued',
      options,
    );
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
  async getUnconfirmedTransactions(options?: PooledTransactionsOptions) {
    return this.get<GetUnconfirmedTransactionsResponseDto>(
      'transactions/unconfirmed',
      options,
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

  private transformQuery<T extends object>(
    options: TransactionQuery<T> | undefined,
    endpoint: TransactionQueryEndpoint,
  ) {
    for (const control of getUnsupportedTransactionQueryControls(
      options,
      endpoint,
    )) {
      const warningKey = `${endpoint}:${control}`;
      if (!this.warnedUnsupportedControls.has(warningKey)) {
        this.warnedUnsupportedControls.add(warningKey);
        this.logger.warn(
          getUnsupportedTransactionQueryControlWarning(control, endpoint),
        );
      }
    }

    if (
      !this.hasWarnedAboutMixedQuery &&
      hasMixedTransactionQueryGroups(options)
    ) {
      this.hasWarnedAboutMixedQuery = true;
      this.logger.warn(
        '[ADAMANT js-api] Query mixes `and` and `or` conditions. ADAMANT Node flattens them in wire order without parentheses, so JavaScript object key order changes the result.',
      );
    }

    return transformTransactionQuery(options, endpoint);
  }
}

export * from './generated';
export {
  type VoteDirection,
  type TransactionQueryEndpoint,
  isVoteDirection,
  parseVote,
  getUnsupportedTransactionQueryControls,
  hasMixedTransactionQueryGroups,
  transformTransactionQuery,
};
