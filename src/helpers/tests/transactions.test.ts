import { TransactionType } from '../constants';
import { createChatTransaction, createDelegateTransaction, createSendTransaction, createStateTransaction, createVoteTransaction } from '../transactions/index'
import { mocked } from './mock-data/address'

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date("2021-02-18"));
});

/**
 * Expected timestamp accross all the created transactions.
 */
const timestamp = 109234800

const keyPair = {
  publicKey: mocked.publicKey,
  privateKey: mocked.privateKey,
}

const { address: senderId } = mocked
const senderPublicKey = mocked.publicKey.toString('hex')

describe('createSendTransaction', () => {
  const type = TransactionType.SEND

  const { recipientId, amount } = mocked

  test('should create simple send transaction', () => {
    const transaction = createSendTransaction({ recipientId, amount, keyPair })

    const expectedSignature =
      'd15cf87edecf808454ac0b7f4d80fc07b72dabe43f7e8ee721f4a208831b18278c9635deb1217610c720c8800daf45b2e4d2dd8ae817111a57b67017424f9502';

    expect(transaction).toStrictEqual({
      type,
      amount,
      recipientId,
      senderId,
      senderPublicKey,
      timestamp,
      asset: {},
      signature: expectedSignature
    });
  });
});

describe('createVoteTransaction', () => {
  const type = TransactionType.VOTE;

  test('should create simple vote transaction', () => {
    const votes = [
      "+b3d0c0b99f64d0960324089eb678e90d8bcbb3dd8c73ee748e026f8b9a5b5468",
      "-9ef1f6212ae871716cfa2d04e3dc5339e8fe75f89818be21ee1d75004983e2a8"
    ];

    const transaction = createVoteTransaction({ keyPair, votes });

    const expectedSignature =
      '53101dc124c0be5d6cafc2116a661884594499ea3fae37c09f4a6514ee4a60523113420e62a5ff001394461f5b72f5fa288cfe314fc05adedf2d367f3d2bd901';

    expect(transaction).toStrictEqual({
      type,
      timestamp,
      amount: 0,
      senderPublicKey,
      senderId,
      asset: {
        votes
      },
      recipientId: senderId,
      signature: expectedSignature
    });
  });
});

describe('createDelegateTransaction', () => {
  const type = TransactionType.DELEGATE;
  const username = 'admtest';

  test('should create simple delegate transaction', () => {
    const data = {
      keyPair,
      username,
    };

    const transaction = createDelegateTransaction(data);

    const expectedSignature =
      '602ead104c66005c2812a5e96e98506771f8ac5e2f21f002e7acb05a5ee0a3db478f2fec993e6997322dfa85cc6dde6286835e12f5211de84bfc1d3add424e00';

    expect(transaction).toStrictEqual({
      type,
      amount: 0,
      timestamp,
      senderPublicKey,
      senderId,
      recipientId: null,
      asset: {
        delegate: {
          username,
          publicKey: senderPublicKey
        },
      },
      signature: expectedSignature
    });
  });
});

describe('Create chat transaction', () => {
  const type = TransactionType.CHAT_MESSAGE;

  test('should create simple chat transaction', () => {
    const { recipientId, amount } = mocked

    const data = {
      keyPair,
      amount,
      recipientId,
      message: 'f96383619244c7e06f39f592b55cc551acc72710',
      own_message: 'd0801b9a647fd1469883f918ec616241c79d6f6f7914ddb0',
      message_type: 1,
    };

    const transaction = createChatTransaction(data);

    const expectedSignature =
      'd720eb7cc1a1ac863a21b02d2537b283bfa056d81761ca133d07253d4d0bd479c321b8cd766bf20d4f5b2de27f7aae8783449f28a8c8ffbf9a9109fe73500f00';

    expect(transaction).toStrictEqual({
      type,
      recipientId,
      timestamp,
      amount,
      senderPublicKey,
      senderId,
      asset: {
        chat: {
          message: data.message,
          own_message: data.own_message,
          type: data.message_type,
        },
      },
      signature: expectedSignature,
    });
  });
});

describe('Create state transaction', () => {
  const type = TransactionType.STATE;

  test('should create simple state transaction', () => {
    const data = {
      key: 'key',
      value: 'value',
    };

    const transaction = createStateTransaction({ ...data, keyPair });

    const expectedSignature =
      '8d1bf8673b83eef10324414b0793ee26942e9379a9c38b1578a7c4df68cd922dd8a007bd6c03b5a0b6e28b0ecc4be8154fb72435d783a54dc35ac4614d095a09';

    expect(transaction).toStrictEqual({
      type,
      senderId,
      senderPublicKey,
      timestamp,
      recipientId: null,
      amount: 0,
      asset: {
        state: {
          key: data.key,
          value: data.value,
          type: 0,
        },
      },
      signature: expectedSignature,
    });
  });
});
