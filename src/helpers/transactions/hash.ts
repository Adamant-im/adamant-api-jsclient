import sodium from "sodium-browserify-tweetnacl";
import ByteBuffer from "bytebuffer";
import crypto from "crypto";

import BigNumber from "bignumber.js";
import { toBuffer } from "../bignumber";

import { MessageType, TransactionType } from "../constants";
import { KeyPair } from "../keys";

export interface BasicTransaction {
  timestamp: number;
  amount: number;
  senderPublicKey: string;
  senderId: string;
  asset: {};
}

export interface SendTransaction extends BasicTransaction {
  type: 0;
  recipientId: string;
  amount: number;
  asset: {};
}

export interface StateTransaction extends BasicTransaction {
  type: 9;
  recipientId: null;
  asset: {
    state: {
      key: string;
      value: string;
      type: 0;
    };
  };
}

export interface ChatTransaction extends BasicTransaction {
  type: 8;
  recipientId: string;
  amount: number;
  asset: {
    chat: {
      message: string;
      own_message: string;
      type: MessageType;
    };
  };
}

export interface DelegateTransaction extends BasicTransaction {
  type: 2;
  recipientId: null;
  asset: {
    delegate: {
      username: string;
      publicKey: string;
    };
  };
}

export interface VoteTransaction extends BasicTransaction {
  type: 3;
  asset: {
    votes: string[];
  };
}

export type AnyTransaction =
  | VoteTransaction
  | DelegateTransaction
  | ChatTransaction
  | StateTransaction
  | SendTransaction;

export function getHash(trs: AnyTransaction) {
  const hash = crypto.createHash("sha256").update(getBytes(trs)).digest();

  return hash;
}

export function getAssetBytes(transaction: AnyTransaction) {
  const { type } = transaction;
  const { VOTE, DELEGATE, CHAT_MESSAGE, STATE } = TransactionType;

  let assetBytes = null;

  if (type === VOTE) {
    assetBytes = voteGetBytes(transaction);
  } else if (type === DELEGATE) {
    assetBytes = delegatesGetBytes(transaction);
  } else if (type === CHAT_MESSAGE) {
    assetBytes = chatGetBytes(transaction);
  } else if (type === STATE) {
    assetBytes = statesGetBytes(transaction);
  }

  return { assetBytes, assetSize: assetBytes?.length || 0 };
}

export function getBytes(transaction: AnyTransaction) {
  const result = getAssetBytes(transaction);

  if (!result) {
    throw new Error("Not supported transaction type");
  }

  const { assetSize, assetBytes } = result;

  const bb = new ByteBuffer(1 + 4 + 32 + 8 + 8 + 64 + 64 + assetSize, true);

  bb.writeByte(transaction.type);
  bb.writeInt(transaction.timestamp);

  const senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, "hex");

  for (const buf of senderPublicKeyBuffer) {
    bb.writeByte(buf);
  }

  if ("recipientId" in transaction && transaction.recipientId) {
    const bignum = new BigNumber(transaction.recipientId.slice(1));
    const recipient = toBuffer(bignum, { size: 8 });

    for (let i = 0; i < 8; i++) {
      bb.writeByte(recipient[i] || 0);
    }
  } else {
    for (let i = 0; i < 8; i++) {
      bb.writeByte(0);
    }
  }

  bb.writeLong(transaction.amount);

  if (assetBytes && assetSize > 0) {
    for (const assetByte of assetBytes) {
      bb.writeByte(assetByte);
    }
  }

  bb.flip();

  const arrayBuffer = new Uint8Array(bb.toArrayBuffer());
  const buffer: number[] = [];

  for (let i = 0; i < arrayBuffer.length; i++) {
    buffer[i] = arrayBuffer[i];
  }

  return Buffer.from(buffer);
}

export function signTransaction(trs: AnyTransaction, keypair: KeyPair) {
  const hash = getHash(trs);

  return sign(hash, keypair).toString("hex");
}

export function voteGetBytes(trs: VoteTransaction) {
  const { votes } = trs.asset;

  return votes ? Buffer.from(votes.join(""), "utf8") : null;
}

export function delegatesGetBytes(trs: DelegateTransaction) {
  const { username } = trs.asset.delegate;

  return username ? Buffer.from(username, "utf8") : null;
}

export function statesGetBytes(trs: StateTransaction) {
  const { value } = trs.asset.state;

  if (!value) {
    return null;
  }

  let buf = Buffer.from([]);

  const { key, type } = trs.asset.state;

  const stateBuf = Buffer.from(value);

  buf = Buffer.concat([buf, stateBuf]);

  if (key) {
    const keyBuf = Buffer.from(key);
    buf = Buffer.concat([buf, keyBuf]);
  }

  const bb = new ByteBuffer(4 + 4, true);

  bb.writeInt(type);
  bb.flip();

  buf = Buffer.concat([buf, bb.toBuffer()]);

  return buf;
}

export function chatGetBytes(trs: ChatTransaction) {
  let buf = Buffer.from([]);

  const { message } = trs.asset.chat;
  const messageBuf = Buffer.from(message, "hex");

  buf = Buffer.concat([buf, messageBuf]);

  const { own_message: ownMessage } = trs.asset.chat;

  if (ownMessage) {
    const ownMessageBuf = Buffer.from(ownMessage, "hex");
    buf = Buffer.concat([buf, ownMessageBuf]);
  }

  const bb = new ByteBuffer(4 + 4, true);

  bb.writeInt(trs.asset.chat.type);
  bb.flip();

  buf = Buffer.concat([buf, Buffer.from(bb.toBuffer())]);

  return buf;
}

export function sign(hash: Buffer, keypair: KeyPair) {
  const sign = sodium.crypto_sign_detached(
    hash,
    Buffer.from(keypair.privateKey),
  );

  return sign;
}
