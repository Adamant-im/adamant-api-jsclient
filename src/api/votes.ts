export enum VoteDirection {
  Positive = '+',
  Negative = '-',
}

export const parseVote = (vote: string) => {
  const name = vote.slice(1);
  const direction = vote.charAt(0);

  return [name, direction];
};
