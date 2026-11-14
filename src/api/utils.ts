import {badParameter} from '../helpers/validator';
import {hasOwnProperty} from '../helpers/utils';
import {TransactionQuery} from '.';

const VOTE_DIRECTIONS = ['+', '-'] as const;

export type VoteDirection = (typeof VOTE_DIRECTIONS)[number];

export const isVoteDirection = (
  direction: unknown,
): direction is VoteDirection =>
  typeof direction === 'string' &&
  VOTE_DIRECTIONS.includes(direction as VoteDirection);

export const parseVote = (vote: string): [string, VoteDirection] => {
  const name = vote.slice(1);
  const direction = vote.charAt(0);

  return [name, direction as VoteDirection];
};

export type TransactionQueryEndpoint =
  'transactions' | 'chatrooms' | 'chats' | 'states';

const COMMON_CONTROL_PARAMETERS = [
  'limit',
  'offset',
  'orderBy',
  'returnUnconfirmed',
] as const;

/** Control and pagination parameters supported by each node endpoint. */
const CONTROL_PARAMETERS: Record<TransactionQueryEndpoint, Set<string>> = {
  transactions: new Set([...COMMON_CONTROL_PARAMETERS, 'returnAsset']),
  chatrooms: new Set([
    ...COMMON_CONTROL_PARAMETERS,
    'includeDirectTransfers',
    'withoutDirectTransfers',
    'userId',
  ]),
  chats: new Set([
    ...COMMON_CONTROL_PARAMETERS,
    'includeDirectTransfers',
    'withoutDirectTransfers',
  ]),
  states: new Set(COMMON_CONTROL_PARAMETERS),
};

/**
 * Known controls are dropped when an endpoint does not support them. Without
 * this guard, a JavaScript caller can accidentally turn a chat-only option
 * into a transaction filter that the node rejects.
 */
const KNOWN_CONTROL_PARAMETERS = new Set(
  Object.values(CONTROL_PARAMETERS).flatMap(parameters => [...parameters]),
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const andOnlyQueryPath = (endpoint: TransactionQueryEndpoint) => {
  switch (endpoint) {
    case 'chatrooms':
      return '/api/chatrooms';
    case 'chats':
      return '/api/chats/get';
    case 'states':
      return '/api/states/get';
    case 'transactions':
      return undefined;
  }
};

/**
 * Chat and KVS endpoints combine plain filter names with `and` and ignore
 * `and:` / `or:` prefixes. An `or` wrapper is rejected so those prefixes are
 * never sent. `/api/transactions` is unchanged and still accepts `or`.
 *
 * Returns `undefined` when the query can be serialized.
 */
export const unsupportedOrQueryResult = <T extends object>(
  obj: TransactionQuery<T> | undefined,
  endpoint: TransactionQueryEndpoint,
): {success: false; errorMessage: string} | undefined => {
  const path = andOnlyQueryPath(endpoint);

  if (!path || !isRecord(obj?.or)) {
    return undefined;
  }

  const {errorMessage} = badParameter(
    'or',
    undefined,
    `${path} does not support or filters. Pass plain filter names; ADAMANT Node combines them with and`,
  );

  return {success: false, errorMessage};
};

const hasFilterProperties = (value: unknown): boolean =>
  isRecord(value) &&
  Object.keys(value).some(property => !KNOWN_CONTROL_PARAMETERS.has(property));

/** Returns known controls that the selected endpoint will ignore. */
export const getUnsupportedTransactionQueryControls = <T extends object>(
  obj?: TransactionQuery<T>,
  endpoint: TransactionQueryEndpoint = 'transactions',
) => {
  if (!obj) {
    return [];
  }

  const controls = CONTROL_PARAMETERS[endpoint];
  const unsupported = new Set<string>();

  for (const value of [obj, obj.and, obj.or]) {
    if (!isRecord(value)) {
      continue;
    }

    for (const property of Object.keys(value)) {
      if (KNOWN_CONTROL_PARAMETERS.has(property) && !controls.has(property)) {
        unsupported.add(property);
      }
    }
  }

  return [...unsupported];
};

/**
 * Reports whether a query combines `or` filters with explicit or implicit
 * `and` filters. The node flattens such queries without parentheses, so callers
 * should be warned that property order changes the resulting SQL expression.
 */
export const hasMixedTransactionQueryGroups = <T extends object>(
  obj?: TransactionQuery<T>,
) => {
  if (!obj) {
    return false;
  }

  const source = obj as Record<string, unknown>;
  const hasOrFilters = hasFilterProperties(source.or);
  const hasExplicitAndFilters = hasFilterProperties(source.and);
  const hasTopLevelAndFilters = Object.keys(source).some(
    property =>
      property !== 'and' &&
      property !== 'or' &&
      !KNOWN_CONTROL_PARAMETERS.has(property),
  );

  return hasOrFilters && (hasExplicitAndFilters || hasTopLevelAndFilters);
};

/**
 * Serializes a transaction query into the flat shape the node expects.
 *
 * On `transactions`, top-level filter conditions are combined with `and`:
 * each is emitted with an `and:` prefix. This differs from the raw node API,
 * whose default for `/api/transactions` is `or`. To opt into `or` semantics,
 * wrap fields in `or: { ... }`; the explicit `and: { ... }` wrapper is also
 * supported. The wrapper objects do not create parentheses: mixed operators
 * remain flat and are emitted in JavaScript object-key order.
 *
 * On `states`, `chats`, and `chatrooms`, filter conditions are emitted under
 * their plain names. Those endpoints already combine plain names with `and`
 * and ignore `and:` / `or:` prefixes (Adamant-im/adamant#277). An explicit
 * `and` wrapper is flattened to plain names. Plain names stay correct after
 * that node bug is fixed, because they are the documented form. An `or`
 * wrapper throws the same `badParameter` message the client methods return,
 * so a prefix the node would ignore cannot be sent.
 *
 * Control and pagination parameters supported by the selected endpoint are
 * passed through unchanged. Known controls unsupported by that endpoint are
 * stripped instead of being serialized as filters.
 *
 * @see https://docs.adamant.im/api/transactions-query-language.html#combine-filters-and-options
 */
export const transformTransactionQuery = <T extends object>(
  obj?: TransactionQuery<T>,
  endpoint: TransactionQueryEndpoint = 'transactions',
) => {
  if (!obj) {
    return {};
  }

  const rejected = unsupportedOrQueryResult(obj, endpoint);
  if (rejected) {
    throw new Error(rejected.errorMessage);
  }

  const source = obj as Record<string, unknown>;
  const transformed: Record<string, unknown> = {};
  const controls = CONTROL_PARAMETERS[endpoint];
  const prefixAndFilters = endpoint === 'transactions';

  for (const prop in source) {
    if (!hasOwnProperty(source, prop)) {
      continue;
    }

    if (prop === 'or' || prop === 'and') {
      const subProps = source[prop];

      if (!isRecord(subProps)) {
        continue;
      }

      for (const subProp in subProps) {
        if (!hasOwnProperty(subProps, subProp)) {
          continue;
        }

        if (KNOWN_CONTROL_PARAMETERS.has(subProp)) {
          if (controls.has(subProp)) {
            transformed[subProp] = subProps[subProp];
          }
          continue;
        }

        transformed[
          prop === 'and' && !prefixAndFilters ? subProp : `${prop}:${subProp}`
        ] = subProps[subProp];
      }

      continue;
    }

    if (KNOWN_CONTROL_PARAMETERS.has(prop)) {
      if (controls.has(prop)) {
        transformed[prop] = source[prop];
      }
      continue;
    }

    // `/api/transactions` defaults to `or`, so top-level filters need `and:`.
    // Chat and KVS endpoints already AND-combine plain names.
    transformed[prefixAndFilters ? `and:${prop}` : prop] = source[prop];
  }

  return transformed;
};
