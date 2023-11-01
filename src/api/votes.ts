export type VoteDirection = '+' | '-';

export const parseVote = (vote: string): [string, VoteDirection] => {
  const name = vote.slice(1);
  const direction = vote.charAt(0);

  return [name, direction as VoteDirection];
};
