# Forming and Signing Transactions

The following methods create and sign transactions, which you can then broadcast
to the ADAMANT network:

- [`createSendTransaction()`](#createsendtransaction)
- [`createStateTransaction()`](#createstatetransaction)
- [`createChatTransaction()`](#createchattransaction)
- [`createDelegateTransaction()`](#createdelegatetransaction)
- [`createVoteTransaction()`](#createvotetransaction)

Further reading:

- [AIP 10: General transaction structure for API calls](https://aips.adamant.im/AIPS/aip-10)
- [Transaction Types](https://github.com/Adamant-im/adamant/wiki/Transaction-Types)
- [Signing Transactions](https://github.com/Adamant-im/adamant/wiki/Signing-Transactions)

## `TransactionType`

`TransactionType` is an enum whose values represent
[Transaction Types](https://github.com/Adamant-im/adamant/wiki/Transaction-Types).

```ts
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
```

```ts
import {WebSocketClient, TransactionType} from 'adamant-api';

const ws = new WebSocketClient();

ws.on(TransactionType.SEND, tx => {
  console.log('Got a Token Transfer!');
});

export {ws};
```

_See [WebSocket Connections](./websocket)._

## `createSendTransaction()`

Forms and signs a type `0`
([Token Transfer](https://github.com/Adamant-im/adamant/wiki/Transaction-Types#type-0-token-transfer-transaction))
transaction.

```ts
type SendTransactionData = {
  keyPair: {
    publicKey: Buffer;
    privateKey: Buffer;
  };
  recipientId: string;
  amount: number;
};
```

**Returns** a formed **send** transaction object with a signature, ready for
broadcasting.

```ts
import {createSendTransaction, createKeypairFromPassphrase} from 'adamant-api';

const keyPair = createKeypairFromPassphrase('apple banana...');

createSendTransaction({
  keyPair,
  recipientId: 'U123...',
  amount: 1000000, // amount in SAT
});
```

## `createStateTransaction()`

Forms and signs a type `9`
([Store data in KVS](https://github.com/Adamant-im/adamant/wiki/Transaction-Types#type-9-store-data-in-kvs-transaction))
transaction.

```ts
type StateTransactionData = {
  keyPair: {
    publicKey: Buffer;
    privateKey: Buffer;
  };
  key: string;
  value: string;
};
```

```ts
import {createStateTransaction, createKeypairFromPassphrase} from 'adamant-api';

const keyPair = createKeypairFromPassphrase('apple banana...');

createStateTransaction({
  keyPair,
  key: 'hello',
  value: 'world',
});
```

## `createChatTransaction()`

Forms and signs a type `8`
([Chat Message](https://github.com/Adamant-im/adamant/wiki/Transaction-Types#type-8-chatmessage-transaction))
transaction.

```ts
enum MessageType {
  Chat = 1,
  Rich = 2,
  Signal = 3,
}

type ChatTransactionData = {
  keyPair: {
    publicKey: Buffer;
    privateKey: Buffer;
  };
  recipientId: `U${string}`;
  message_type: MessageType;
  amount?: number;
  message: string;
  own_message: string;
};
```

```ts
import {
  createChatTransaction,
  createKeypairFromPassphrase,
  MessageType,
} from 'adamant-api';

const keyPair = createKeypairFromPassphrase('apple banana...');

createChatTransaction({
  keyPair,
  recipientId: 'U123...',
  message_type: MessageType.Chat,
  message: 'Hello, world!',
  own_message: '1',
});
```

## `createDelegateTransaction()`

Forms and signs a type `2`
([Delegate Registration](https://github.com/Adamant-im/adamant/wiki/Transaction-Types#type-2-delegate-registration-transaction))
transaction.

```ts
type DelegateTransactionData = {
  keyPair: {
    publicKey: Buffer;
    privateKey: Buffer;
  };
  username: string;
};
```

```ts
import {
  createDelegateTransaction,
  createKeypairFromPassphrase,
} from 'adamant-api';

const keyPair = createKeypairFromPassphrase('apple banana...');

createDelegateTransaction({
  keyPair,
  username: 'my_unique_username',
});
```

## `createVoteTransaction()`

Forms and signs a type `3`
([Vote For Delegate](https://github.com/Adamant-im/adamant/wiki/Transaction-Types#type-3-vote-for-delegate-transaction))
transaction.

```ts
type VoteTransactionData = {
  keyPair: {
    publicKey: Buffer;
    privateKey: Buffer;
  };
  votes: string[];
};
```

```ts
import {createVoteTransaction, createKeypairFromPassphrase} from 'adamant-api';

const keyPair = createKeypairFromPassphrase('apple banana...');

createVoteTransaction({
  keyPair,
  votes: [
    '+b3d0c0b99f64d0960324089eb678e90d8bcbb3dd8c73ee748e026f8b9a5b5468',
    '-9ef1f6212ae871716cfa2d04e3dc5339e8fe75f89818be21ee1d75004983e2a8',
  ],
});
```

For the complete, generated type signatures of each helper, see the
[API Reference](/api/).
