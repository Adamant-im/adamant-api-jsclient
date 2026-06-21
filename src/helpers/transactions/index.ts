import {signTransaction} from './hash';

import {createAddressFromPublicKey} from '../keys';
import {getEpochTime} from '../time';

import {MessageType, TransactionType} from '../constants';
import type {KeyPair} from '../keys';
import type {AdamantAddress} from '../../api';

export type AnyTransactionData = (
  | SendTransactionData
  | ChatTransactionData
  | VoteTransactionData
  | DelegateTransactionData
  | StateTransactionData
) & {
  transactionType: TransactionType;
};

export interface BasicTransactionData {
  keyPair: KeyPair;
  /**
   * Optional transaction time in milliseconds since the ADAMANT epoch.
   *
   * When provided, the second-precision `timestamp` is derived from it with
   * `Math.floor(timestampMs / 1000)`. The field is attached to the transaction
   * but is excluded from the signed bytes, so it stays backward compatible:
   * older nodes ignore it, while upgraded nodes persist it for
   * millisecond-precision ordering.
   */
  timestampMs?: number;
}

export interface SendTransactionData extends BasicTransactionData {
  recipientId: string;
  amount: number;
}

export interface ChatTransactionData extends BasicTransactionData {
  recipientId: AdamantAddress;
  message_type: MessageType;
  amount?: number;
  message: string;
  own_message: string;
}

export interface VoteTransactionData extends BasicTransactionData {
  votes: string[];
}

export interface DelegateTransactionData extends BasicTransactionData {
  username: string;
}

export interface StateTransactionData extends BasicTransactionData {
  key: string;
  value: string;
}

interface BasicTransaction<T extends TransactionType> {
  type: T;
  timestamp: number;
  timestampMs?: number;
  amount: number;
  senderPublicKey: string;
  senderId: AdamantAddress;
  asset: {};
}

/** Builds the unsigned fields shared by ADM transactions. */
export const createBasicTransaction = <T extends TransactionType>(
  data: AnyTransactionData,
): BasicTransaction<T> => {
  const {timestampMs} = data;

  const transaction = {
    type: data.transactionType as T,
    timestamp:
      timestampMs !== undefined
        ? Math.floor(timestampMs / 1000)
        : getEpochTime(),
    amount: 0,
    senderPublicKey: data.keyPair.publicKey.toString('hex'),
    senderId: createAddressFromPublicKey(data.keyPair.publicKey),
    asset: {},
    ...(timestampMs !== undefined ? {timestampMs} : {}),
  };

  return transaction;
};

/** Creates and signs an ADM token transfer transaction. */
export const createSendTransaction = (data: SendTransactionData) => {
  const details = {
    ...data,
    transactionType: TransactionType.SEND,
  };

  const transaction = {
    ...createBasicTransaction<TransactionType.SEND>(details),
    recipientId: details.recipientId,
    amount: details.amount,
    asset: {},
  };

  const signature = signTransaction(transaction, details.keyPair);

  return {
    ...transaction,
    signature,
  };
};

/** Creates and signs an ADM key-value state transaction. */
export const createStateTransaction = (data: StateTransactionData) => {
  const details = {
    ...data,
    transactionType: TransactionType.STATE,
  };

  const transaction = {
    ...createBasicTransaction<TransactionType.STATE>(details),
    recipientId: null,
    asset: {
      state: {
        key: details.key,
        value: details.value,
        type: 0 as const,
      },
    },
  };

  const signature = signTransaction(transaction, details.keyPair);

  return {
    ...transaction,
    signature,
  };
};

/** Creates and signs an encrypted ADM chat transaction envelope. */
export const createChatTransaction = (data: ChatTransactionData) => {
  const details = {
    ...data,
    transactionType: TransactionType.CHAT_MESSAGE,
  };

  const transaction = {
    ...createBasicTransaction<TransactionType.CHAT_MESSAGE>(details),
    recipientId: details.recipientId,
    amount: details.amount || 0,
    asset: {
      chat: {
        message: data.message,
        own_message: data.own_message,
        type: data.message_type,
      },
    },
  };

  const signature = signTransaction(transaction, details.keyPair);

  return {
    ...transaction,
    signature,
  };
};

/** Creates and signs an ADM delegate registration transaction. */
export const createDelegateTransaction = (data: DelegateTransactionData) => {
  const details = {
    ...data,
    transactionType: TransactionType.DELEGATE,
  };

  const transaction = {
    ...createBasicTransaction<TransactionType.DELEGATE>(details),
    recipientId: null,
    asset: {
      delegate: {
        username: details.username,
        publicKey: details.keyPair.publicKey.toString('hex'),
      },
    },
  };

  const signature = signTransaction(transaction, details.keyPair);

  return {
    ...transaction,
    signature,
  };
};

/** Creates and signs an ADM delegate vote transaction. */
export const createVoteTransaction = (data: VoteTransactionData) => {
  const details = {
    ...data,
    transactionType: TransactionType.VOTE,
  };

  const basicTransaction =
    createBasicTransaction<TransactionType.VOTE>(details);

  const transaction = {
    ...basicTransaction,
    recipientId: basicTransaction.senderId,
    asset: {
      votes: details.votes,
    },
  };

  const signature = signTransaction(transaction, details.keyPair);

  return {
    ...transaction,
    signature,
  };
};

export * from './hash';
export * from './id';
