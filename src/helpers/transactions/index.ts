import { signTransaction } from "./hash";

import { createAddressFromPublicKey } from "../keys";
import { getEpochTime } from "../time";

import { TransactionType } from "../constants";
import type { KeyPair } from "../keys";
import { MessageType } from "../validator";

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
}

export interface SendTransactionData extends BasicTransactionData {
  recipientId: string;
  amount: number;
}

export interface ChatTransactionData extends BasicTransactionData {
  recipientId: `U${string}`;
  message_type: MessageType;
  amount: number | undefined;
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
  amount: number;
  senderPublicKey: string;
  senderId: `U${string}`;
  asset: {};
}

export const createBasicTransaction = <T extends TransactionType>(
  data: AnyTransactionData,
): BasicTransaction<T> => {
  const transaction = {
    type: data.transactionType as T,
    timestamp: getEpochTime(),
    amount: 0,
    senderPublicKey: data.keyPair.publicKey.toString("hex"),
    senderId: createAddressFromPublicKey(data.keyPair.publicKey),
    asset: {},
  };

  return transaction;
};

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
        type: 0 as 0,
      },
    },
  };

  const signature = signTransaction(transaction, details.keyPair);

  return {
    ...transaction,
    signature,
  };
};

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
        publicKey: details.keyPair.publicKey.toString("hex"),
      },
    },
  };

  const signature = signTransaction(transaction, details.keyPair);

  return {
    ...transaction,
    signature,
  };
};

export const createVoteTransaction = (data: VoteTransactionData) => {
  const details = {
    ...data,
    transactionType: TransactionType.VOTE,
  };

  const transaction = {
    ...createBasicTransaction<TransactionType.VOTE>(details),
    asset: {
      votes: details.votes,
    },
  };

  const recipientId = transaction.senderId;
  const signature = signTransaction(transaction, details.keyPair);

  return {
    ...transaction,
    recipientId,
    signature,
  };
};
