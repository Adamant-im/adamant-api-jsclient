const transactionFormer = require('../transactionFormer');
const keys = require('../keys');
const constants = require('../constants');

const passPhrase = keys.createNewPassPhrase();
const keyPair = keys.createKeypairFromPassPhrase(passPhrase);

describe('Create send transaction', () => {
  const transactionType = constants.transactionTypes.SEND;

  test('Should create base transaction', () => {
    const data = {
      keyPair,
      recipientId: 'U123456',
      amount: 1,
    };

    const transaction = transactionFormer.createTransaction(transactionType, data);

    expect(transaction).toMatchObject({
      type: transactionType,
      amount: 1,
      recipientId: 'U123456',
    });
    expect(transaction).toHaveProperty('timestamp');
    expect(transaction).toHaveProperty('senderPublicKey');
    expect(transaction).toHaveProperty('senderId');
    expect(transaction).toHaveProperty('asset');
    expect(transaction).toHaveProperty('signature');
    expect(
        typeof transaction.signature,
    ).toBe('string');
  });
});

describe('Create vote transaction', () => {
  const transactionType = constants.transactionTypes.VOTE;

  test('Should create base transaction', () => {
    const data = {
      keyPair,
      votes: [],
    };

    const transaction = transactionFormer.createTransaction(transactionType, data);

    expect(transaction).toMatchObject({
      type: transactionType,
      amount: 0,
    });
    expect(transaction).toHaveProperty('timestamp');
    expect(transaction).toHaveProperty('recipientId');
    expect(transaction).toHaveProperty('senderPublicKey');
    expect(transaction).toHaveProperty('senderId');
    expect(transaction).toHaveProperty('asset');
    expect(transaction).toHaveProperty('signature');
    expect(
        typeof transaction.signature,
    ).toBe('string');
  });
});

describe('Create delegate transaction', () => {
  const transactionType = constants.transactionTypes.DELEGATE;
  const username = 'admtest';

  test('Should create base transaction', () => {
    const data = {
      keyPair,
      username,
    };

    const transaction = transactionFormer.createTransaction(transactionType, data);

    expect(transaction).toMatchObject({
      type: transactionType,
      amount: 0,
      asset: {
        delegate: {
          username,
        },
      },
    });
    expect(transaction).toHaveProperty('timestamp');
    expect(transaction).toHaveProperty('senderPublicKey');
    expect(transaction).toHaveProperty('senderId');
    expect(transaction).toHaveProperty('asset');
    expect(transaction).toHaveProperty('recipientId');
    expect(transaction).toHaveProperty('asset.delegate.publicKey');
    expect(transaction).toHaveProperty('signature');
    expect(
        typeof transaction.signature,
    ).toBe('string');
  });
});

describe('Create chat transaction', () => {
  const transactionType = constants.transactionTypes.CHAT_MESSAGE;

  test('Should create base transaction', () => {
    const data = {
      keyPair,
      amount: 1,
      message: 'Hello!',
      own_message: null,
      message_type: 0,
      recipientId: 'U123456',
    };

    const transaction = transactionFormer.createTransaction(transactionType, data);

    expect(transaction).toMatchObject({
      type: transactionType,
      recipientId: data.recipientId,
      amount: 1,
      asset: {
        chat: {
          message: data.message,
          own_message: data.own_message,
          type: data.message_type,
        },
      },
    });
    expect(transaction).toHaveProperty('timestamp');
    expect(transaction).toHaveProperty('senderPublicKey');
    expect(transaction).toHaveProperty('senderId');
    expect(transaction).toHaveProperty('asset');
    expect(transaction).toHaveProperty('recipientId');
    expect(transaction).toHaveProperty('signature');
    expect(
        typeof transaction.signature,
    ).toBe('string');
  });
});

describe('Create state transaction', () => {
  const transactionType = constants.transactionTypes.STATE;

  test('Should create base transaction', () => {
    const data = {
      keyPair,
      key: 'key',
      value: 'value',
    };

    const transaction = transactionFormer.createTransaction(transactionType, data);

    expect(transaction).toMatchObject({
      type: transactionType,
      recipientId: null,
      amount: 0,
      asset: {
        state: {
          key: data.key,
          value: data.value,
          type: 0,
        },
      },
    });
    expect(transaction).toHaveProperty('timestamp');
    expect(transaction).toHaveProperty('senderPublicKey');
    expect(transaction).toHaveProperty('senderId');
    expect(transaction).toHaveProperty('asset');
    expect(transaction).toHaveProperty('recipientId');
    expect(transaction).toHaveProperty('signature');
    expect(
        typeof transaction.signature,
    ).toBe('string');
  });
});

