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

/**
 * Control and pagination parameters that are never filter conditions, so they
 * are passed through verbatim and never get an `and:` / `or:` prefix.
 */
const CONTROL_PARAMETERS = new Set<string>([
  'limit',
  'offset',
  'orderBy',
  'returnUnconfirmed',
  'returnAsset',
  'includeDirectTransfers',
  'withoutDirectTransfers',
  'userId',
]);

/**
 * Serializes a transaction query into the flat shape the node expects.
 *
 * Top-level filter conditions are combined with `and` by default: each is
 * emitted with an `and:` prefix. This differs from the raw node API, whose
 * default is `or`. To opt into `or` semantics, wrap fields in `or: { ... }`;
 * the explicit `and: { ... }` wrapper is also still supported (and equivalent
 * to passing those fields at the top level).
 *
 * Control and pagination parameters (`limit`, `offset`, `orderBy`,
 * `returnAsset`, `returnUnconfirmed`, the direct-transfer flags, and `userId`)
 * are not filters and are passed through unchanged.
 *
 * @see https://docs.adamant.im/api/transactions-query-language.html#combine-filters-and-options
 */
export const transformTransactionQuery = <T extends object>(
  obj?: TransactionQuery<T>,
) => {
  if (!obj) {
    return {};
  }

  const source = obj as Record<string, unknown>;
  const transformed: Record<string, unknown> = {};

  for (const prop in source) {
    if (!hasOwnProperty(source, prop)) {
      continue;
    }

    if (prop === 'or' || prop === 'and') {
      const subProps = source[prop] as Record<string, unknown>;

      for (const subProp in subProps) {
        if (hasOwnProperty(subProps, subProp)) {
          transformed[`${prop}:${subProp}`] = subProps[subProp];
        }
      }

      continue;
    }

    if (CONTROL_PARAMETERS.has(prop)) {
      transformed[prop] = source[prop];
      continue;
    }

    // Default: combine top-level filter conditions with `and`.
    transformed[`and:${prop}`] = source[prop];
  }

  return transformed;
};
