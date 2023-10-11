export enum TransactionType {
  SEND,
  SIGNATURE,
  DELEGATE,
  VOTE,
  MULTI,
  DAPP,
  IN_TRANSFER,
  OUT_TRANSFER,
  CHAT_MESSAGE,
  STATE,
}

export const MAX_VOTES_PER_TRANSACTION = 33;

/**
 * 4 seconds
 */
export const HEALTH_CHECK_TIMEOUT = 4000;

export const DEFAULT_GET_REQUEST_RETRIES = 3;

export const SAT = 100_000_000;

export const fees = {
  send: 50000000,
  vote: 1000000000,
  secondsignature: 500000000,
  delegate: 30000000000,
  multisignature: 500000000,
  dapp: 2500000000,
  old_chat_message: 500000,
  chat_message: 100000,
  profile_update: 5000000,
  avatar_upload: 10000000,
  state_store: 100000,
};
