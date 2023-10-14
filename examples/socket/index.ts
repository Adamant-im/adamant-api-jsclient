import {
  AdamantApi,
  TransactionType,
  decodeMessage,
  type ChatMessageTransaction,
  type TokenTransferTransaction,
} from 'adamant-api';

const nodes = [
  'https://endless.adamant.im',
  'https://clown.adamant.im',
  'http://23.226.231.225:36666',
  'http://88.198.156.44:36666',
  'https://lake.adamant.im',
];

const api = new AdamantApi({
  nodes,
});

/**
 * ADM address to subscribe to notifications
 */
const admAddress = process.env.ADAMANT_ADDRESS as `U${string}`;
/**
 * Pass phrase to decode messages
 */
const passphrase = process.env.PASSPHRASE!;

api.initSocket({
  admAddress,
  onNewMessage(transaction: ChatMessageTransaction | TokenTransferTransaction) {
    /**
     * Handle chat messages only
     */
    if (transaction.type === TransactionType.CHAT_MESSAGE) {
      const {chat} = transaction.asset;

      const decoded = decodeMessage(
        chat.message,
        transaction.senderPublicKey,
        passphrase,
        chat.own_message
      );

      console.log(
        `Got a new message from ${transaction.senderId}:\n  "${decoded}"`
      );
    }
  },
});
