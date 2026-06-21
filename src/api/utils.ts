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

export const transformTransactionQuery = <T extends object>(
  obj?: TransactionQuery<T>,
) => {
  if (!obj) {
    return {};
  }

  const transformed: Record<string, unknown> = {
    ...obj,
  };

  for (const topLevelProp in obj) {
    if (hasOwnProperty(obj, topLevelProp)) {
      if (topLevelProp === 'or' || topLevelProp === 'and') {
        const subProps = obj[topLevelProp];

        for (const subProp in subProps) {
          if (hasOwnProperty(subProps, subProp)) {
            const newKey = `${topLevelProp}:${subProp}`;
            transformed[newKey] = subProps[subProp];
          }
        }

        delete transformed[topLevelProp];
      }
    }
  }

  return transformed;
};
