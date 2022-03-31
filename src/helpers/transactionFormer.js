const sodium = require('sodium-browserify-tweetnacl');
const crypto = require('crypto');
const ByteBuffer = require('bytebuffer');

const BigNum = require('./bignumber.js');
const keys = require('./keys.js');
const constants = require('./constants.js');
const time = require('./time.js');

module.exports = {
  createTransaction(type, data) {
    const {
      SEND,
      VOTE,
      DELEGATE,
      CHAT_MESSAGE,
      STATE,
    } = constants.transactionTypes;

    const actions = {
      [SEND]: () => this.createSendTransaction(data),
      [VOTE]: () => this.createVoteTransaction(data),
      [DELEGATE]: () => this.createDelegateTransaction(data),
      [CHAT_MESSAGE]: () => this.createChatTransaction(data),
      [STATE]: () => this.createStateTransaction(data),
    };

    const action = actions[type];

    return action ? action() : ({});
  },
  createBasicTransaction(data) {
    const transaction = {
      type: data.transactionType,
      timestamp: time.getTime(),
      amount: 0,
      senderPublicKey: data.keyPair.publicKey.toString('hex'),
      senderId: keys.createAddressFromPublicKey(data.keyPair.publicKey),
      asset: {},
    };

    return transaction;
  },
  createSendTransaction(data) {
    const details = {
      ...data,
      transactionType: constants.transactionTypes.SEND,
    };

    const transaction = {
      ...this.createBasicTransaction(details),
      recipientId: details.recipientId,
      amount: details.amount,
      asset: {},
    };

    transaction.signature = this.transactionSign(transaction, details.keyPair);

    return transaction;
  },
  createStateTransaction(data) {
    const details = {
      ...data,
      transactionType: constants.transactionTypes.STATE,
    };

    const transaction = {
      ...this.createBasicTransaction(details),
      recipientId: null,
      asset: {
        state: {
          key: details.key,
          value: details.value,
          type: 0,
        },
      },
    };

    transaction.signature = this.transactionSign(transaction, details.keyPair);

    return transaction;
  },
  createChatTransaction(data) {
    const details = {
      ...data,
      transactionType: constants.transactionTypes.CHAT_MESSAGE,
    };

    const transaction = {
      ...this.createBasicTransaction(details),
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

    transaction.signature = this.transactionSign(transaction, details.keyPair);

    return transaction;
  },
  createDelegateTransaction(data) {
    const details = {
      ...data,
      transactionType: constants.transactionTypes.DELEGATE,
    };

    const transaction = {
      ...this.createBasicTransaction(details),
      recipientId: null,
      asset: {
        delegate: {
          username: details.username,
          publicKey: details.keyPair.publicKey.toString('hex'),
        },
      },
    };

    transaction.signature = this.transactionSign(transaction, details.keyPair);

    return transaction;
  },
  createVoteTransaction(data) {
    const details = {
      ...data,
      transactionType: constants.transactionTypes.VOTE,
    };

    const transaction = {
      ...this.createBasicTransaction(details),
      asset: {
        votes: details.votes,
      },
    };

    transaction.recipientId = transaction.senderId;
    transaction.signature = this.transactionSign(transaction, details.keyPair);

    return transaction;
  },
  getHash(trs) {
    const hash = crypto
        .createHash('sha256')
        .update(this.getBytes(trs))
        .digest();

    return hash;
  },
  getAssetBytes(transaction) {
    const {type} = transaction;
    const {
      SEND,
      VOTE,
      DELEGATE,
      CHAT_MESSAGE,
      STATE,
    } = constants.transactionTypes;

    if (type === SEND) {
      return {assetBytes: null, assetSize: 0};
    }

    const actions = {
      [VOTE]: this.voteGetBytes,
      [DELEGATE]: this.delegatesGetBytes,
      [CHAT_MESSAGE]: this.chatGetBytes,
      [STATE]: this.statesGetBytes,
    };

    const getBytes = actions[type];

    if (typeof getBytes === 'function') {
      const assetBytes = getBytes(transaction);

      return {assetBytes, assetSize: assetBytes.length};
    }
  },
  getBytes(transaction) {
    const skipSignature = false;
    const skipSecondSignature = true;

    const {assetSize, assetBytes} = this.getAssetBytes(transaction);

    const bb = new ByteBuffer(1 + 4 + 32 + 8 + 8 + 64 + 64 + assetSize, true);

    bb.writeByte(transaction.type);
    bb.writeInt(transaction.timestamp);

    const senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, 'hex');

    for (const buf of senderPublicKeyBuffer) {
      bb.writeByte(buf);
    }

    if (transaction.requesterPublicKey) {
      const requesterPublicKey = Buffer.from(transaction.requesterPublicKey, 'hex');

      for (const buf of requesterPublicKey) {
        bb.writeByte(buf);
      }
    }

    if (transaction.recipientId) {
      const recipient = new BigNum(
          transaction.recipientId.slice(1),
      ).toBuffer({size: 8});

      for (let i = 0; i < 8; i++) {
        bb.writeByte(recipient[i] || 0);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        bb.writeByte(0);
      }
    }

    bb.writeLong(transaction.amount);

    if (assetSize > 0) {
      for (const assetByte of assetBytes) {
        bb.writeByte(assetByte);
      }
    }

    if (!skipSignature && transaction.signature) {
      const signatureBuffer = Buffer.from(transaction.signature, 'hex');

      for (const buf of signatureBuffer) {
        bb.writeByte(buf);
      }
    }

    if (!skipSecondSignature && transaction.signSignature) {
      const signSignatureBuffer = Buffer.from(transaction.signSignature, 'hex');

      for (const buf of signSignatureBuffer) {
        bb.writeByte(buf);
      }
    }

    bb.flip();

    const arrayBuffer = new Uint8Array(bb.toArrayBuffer());
    const buffer = [];

    for (let i = 0; i < arrayBuffer.length; i++) {
      buffer[i] = arrayBuffer[i];
    }

    return Buffer.from(buffer);
  },
  transactionSign(trs, keypair) {
    const hash = this.getHash(trs);

    return this.sign(hash, keypair).toString('hex');
  },
  voteGetBytes(trs) {
    const {votes} = trs.asset;

    const buf = votes ?
      Buffer.from(votes.join(''), 'utf8') :
      null;

    return buf;
  },
  delegatesGetBytes(trs) {
    const {username} = trs.asset.delegate;

    const buf = username ?
      Buffer.from(username, 'utf8') :
      null;

    return buf;
  },
  statesGetBytes(trs) {
    const {value} = trs.asset.state;

    if (!value) {
      return null;
    }

    let buf = Buffer.from([]);

    const {key, type} = trs.asset.state;

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
  },
  chatGetBytes(trs) {
    let buf = Buffer.from([]);

    const {message} = trs.asset.chat;
    const messageBuf = Buffer.from(message, 'hex');

    buf = Buffer.concat([buf, messageBuf]);

    const {own_message: ownMessage} = trs.asset.chat;

    if (ownMessage) {
      const ownMessageBuf = Buffer.from(ownMessage, 'hex');
      buf = Buffer.concat([buf, ownMessageBuf]);
    }

    const bb = new ByteBuffer(4 + 4, true);

    bb.writeInt(trs.asset.chat.type);
    bb.flip();

    buf = Buffer.concat([buf, Buffer.from(bb.toBuffer())]);

    return buf;
  },
  sign(hash, keypair) {
    const sign = sodium.crypto_sign_detached(
        hash,
        Buffer.from(keypair.privateKey, 'hex'),
    );

    return sign;
  },
};
