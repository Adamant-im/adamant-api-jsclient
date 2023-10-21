import {
  AdamantApi,
  TransactionType,
  decodeMessage,
  WebSocketClient,
  ChatMessageTransaction,
} from 'adamant-api';

const nodes = [
  'https://endless.adamant.im',
  'https://clown.adamant.im',
  'http://23.226.231.225:36666',
  'http://88.198.156.44:36666',
  'https://lake.adamant.im',
];

/**
 * ADM address to subscribe to notifications
 */
const admAddress = process.env.ADAMANT_ADDRESS as `U${string}`;
/**
 * Pass phrase to decode messages
 */
const passphrase = process.env.PASSPHRASE!;

const socket = new WebSocketClient({admAddress});

function onChatTransaction(transaction: ChatMessageTransaction) {
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

/**
 * Handle chat messages only
 */
socket.on(TransactionType.CHAT_MESSAGE, onChatTransaction);

// or

// socket.on((transaction: AnyTransaction) => {
//   if (transaction.type === TransactionType.CHAT_MESSAGE) {
//     console.log(transaction);
//   }
// });

setTimeout(() => {
  console.log('the handler has been removed');
  /**
   * Remove the handler from all types
   */
  socket.off(onChatTransaction);
}, 60 * 1000);

const api = new AdamantApi({
  nodes,
  socket,
});

export default api;
