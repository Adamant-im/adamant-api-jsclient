const sodium = require('sodium-browserify-tweetnacl');
const crypto = require('crypto');
const bignum = require('./bignumber.js');
const keys = require('./keys.js');
const ByteBuffer = require('bytebuffer');
const constants = require('./constants.js');
const time = require('./time.js');

module.exports = {

  createTransaction: function(type, data) {
    switch (type) {
      case constants.transactionTypes.SEND:
        return this.createSendTransaction(data);
      case constants.transactionTypes.VOTE:
        return this.createVoteTransaction(data);
      case constants.transactionTypes.DELEGATE:
        return this.createDelegateTransaction(data);
      case constants.transactionTypes.CHAT_MESSAGE:
        return this.createChatTransaction(data);
      case constants.transactionTypes.STATE:
        return this.createStateTransaction(data);
    }
    return {};
  },

  createBasicTransaction: function(data) {
    const transaction = {type: data.transactionType, amount: 0, timestamp: time.getTime(), asset: {}, senderPublicKey: data.keyPair.publicKey.toString('hex'), senderId: keys.createAddressFromPublicKey(data.keyPair.publicKey)};
    return transaction;
  },

  createSendTransaction: function(data) {
    data.transactionType = constants.transactionTypes.SEND;
    const transaction = this.createBasicTransaction(data);
    transaction.asset = {};
    transaction.recipientId = data.recipientId;
    transaction.amount = data.amount;
    transaction.signature = this.transactionSign(transaction, data.keyPair);
    return transaction;
  },

  createStateTransaction: function(data) {
    data.transactionType = constants.transactionTypes.STATE;
    const transaction = this.createBasicTransaction(data);
    transaction.asset = {
      'state': {
        key: data.key,
        value: data.value,
        type: 0,
      },
    };
    transaction.recipientId = null;
    transaction.amount = 0;
    transaction.signature = this.transactionSign(transaction, data.keyPair);
    return transaction;
  },

  createChatTransaction: function(data) {
    data.transactionType = constants.transactionTypes.CHAT_MESSAGE;
    const transaction = this.createBasicTransaction(data);
    transaction.asset = {
      'chat': {
        message: data.message,
        own_message: data.own_message,
        type: data.message_type,
      },
    };
    transaction.recipientId = data.recipientId;
    transaction.amount = data.amount || 0;
    transaction.signature = this.transactionSign(transaction, data.keyPair);
    return transaction;
  },

  createDelegateTransaction: function(data) {
    data.transactionType = constants.transactionTypes.DELEGATE;
    const transaction = this.createBasicTransaction(data);
    transaction.asset = {'delegate': {'username': data.username, publicKey: data.keyPair.publicKey.toString('hex')}};
    transaction.recipientId = null;
    transaction.signature = this.transactionSign(transaction, data.keyPair);
    return transaction;
  },

  createVoteTransaction: function(data) {
    data.transactionType = constants.transactionTypes.VOTE;
    const transaction = this.createBasicTransaction(data);
    transaction.asset = {'votes': data.votes};
    transaction.recipientId = transaction.senderId;
    transaction.signature = this.transactionSign(transaction, data.keyPair);
    return transaction;
  },

  getHash: function(trs) {
    return crypto.createHash('sha256').update(this.getBytes(trs)).digest();
  },

  getBytes: function(transaction) {
    const skipSignature = false;
    const skipSecondSignature = true;
    let assetSize = 0;
    let assetBytes = null;

    switch (transaction.type) {
      case constants.transactionTypes.SEND:
        break;
      case constants.transactionTypes.DELEGATE:
        assetBytes = this.delegatesGetBytes(transaction);
        assetSize = assetBytes.length;
        break;
      case constants.transactionTypes.STATE:
        assetBytes = this.statesGetBytes(transaction);
        assetSize = assetBytes.length;
        break;
      case constants.transactionTypes.VOTE:
        assetBytes = this.voteGetBytes(transaction);
        assetSize = assetBytes.length;
        break;
      case constants.transactionTypes.CHAT_MESSAGE:
        assetBytes = this.chatGetBytes(transaction);
        assetSize = assetBytes.length;
        break;
      default:
        // 'Not supported yet'
        return 0;
    }

    const bb = new ByteBuffer(1 + 4 + 32 + 8 + 8 + 64 + 64 + assetSize, true);

    bb.writeByte(transaction.type);
    bb.writeInt(transaction.timestamp);

    const senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, 'hex');
    for (var i = 0; i < senderPublicKeyBuffer.length; i++) {
      bb.writeByte(senderPublicKeyBuffer[i]);
    }

    if (transaction.requesterPublicKey) {
      const requesterPublicKey = Buffer.from(transaction.requesterPublicKey, 'hex');

      for (var i = 0; i < requesterPublicKey.length; i++) {
        bb.writeByte(requesterPublicKey[i]);
      }
    }

    if (transaction.recipientId) {
      let recipient = transaction.recipientId.slice(1);
      recipient = new bignum(recipient).toBuffer({size: 8});

      for (i = 0; i < 8; i++) {
        bb.writeByte(recipient[i] || 0);
      }
    } else {
      for (i = 0; i < 8; i++) {
        bb.writeByte(0);
      }
    }

    bb.writeLong(transaction.amount);

    if (assetSize > 0) {
      for (var i = 0; i < assetSize; i++) {
        bb.writeByte(assetBytes[i]);
      }
    }

    if (!skipSignature && transaction.signature) {
      const signatureBuffer = Buffer.from(transaction.signature, 'hex');
      for (var i = 0; i < signatureBuffer.length; i++) {
        bb.writeByte(signatureBuffer[i]);
      }
    }

    if (!skipSecondSignature && transaction.signSignature) {
      const signSignatureBuffer = Buffer.from(transaction.signSignature, 'hex');
      for (var i = 0; i < signSignatureBuffer.length; i++) {
        bb.writeByte(signSignatureBuffer[i]);
      }
    }

    bb.flip();
    const arrayBuffer = new Uint8Array(bb.toArrayBuffer());
    const buffer = [];

    for (var i = 0; i < arrayBuffer.length; i++) {
      buffer[i] = arrayBuffer[i];
    }

    return Buffer.from(buffer);
  },

  transactionSign: function(trs, keypair) {
    const hash = this.getHash(trs);
    return this.sign(hash, keypair).toString('hex');
  },

  voteGetBytes: function(trs) {
    let buf;
    try {
      buf = trs.asset.votes ? Buffer.from(trs.asset.votes.join(''), 'utf8') : null;
    } catch (e) {
      throw e;
    }
    return buf;
  },

  delegatesGetBytes: function(trs) {
    if (!trs.asset.delegate.username) {
      return null;
    }
    let buf;

    try {
      buf = Buffer.from(trs.asset.delegate.username, 'utf8');
    } catch (e) {
      throw e;
    }
    return buf;
  },

  statesGetBytes: function(trs) {
    if (!trs.asset.state.value) {
      return null;
    }
    let buf;

    try {
      buf = Buffer.from([]);
      const stateBuf = Buffer.from(trs.asset.state.value);
      buf = Buffer.concat([buf, stateBuf]);
      if (trs.asset.state.key) {
        const keyBuf = Buffer.from(trs.asset.state.key);
        buf = Buffer.concat([buf, keyBuf]);
      }

      const bb = new ByteBuffer(4 + 4, true);
      bb.writeInt(trs.asset.state.type);
      bb.flip();

      buf = Buffer.concat([buf, bb.toBuffer()]);
    } catch (e) {
      throw e;
    }

    return buf;
  },

  chatGetBytes: function(trs) {
    let buf;

    try {
      buf = Buffer.from([]);
      const messageBuf = Buffer.from(trs.asset.chat.message, 'hex');
      buf = Buffer.concat([buf, messageBuf]);

      if (trs.asset.chat.own_message) {
        const ownMessageBuf = Buffer.from(trs.asset.chat.own_message, 'hex');
        buf = Buffer.concat([buf, ownMessageBuf]);
      }
      const bb = new ByteBuffer(4 + 4, true);
      bb.writeInt(trs.asset.chat.type);
      bb.flip();
      buf = Buffer.concat([buf, Buffer.from(bb.toBuffer())]);
    } catch (e) {
      throw e;
    }

    return buf;
  },

  sign: function(hash, keypair) {
    return sodium.crypto_sign_detached(hash, Buffer.from(keypair.privateKey, 'hex'));
  },

};
