# Calculating Transaction ID

The transaction ID is derived from the signed transaction. The signing and
hashing algorithm is described in
[Signing Transactions](https://docs.adamant.im/essentials/signing-transactions.html).

## `getTransactionId()`

To get a transaction ID with `adamant-api`, pass a **signed** transaction
(including its signature) to `getTransactionId()`. It returns the transaction ID
as a string.

```ts
import {getTransactionId} from 'adamant-api';

const id = getTransactionId({
  type: 8,
  amount: 0,
  timestamp: 194049840,
  asset: {
    chat: {
      message: '7189aba904138dd1d53948ed1e5b1d18a11ba1910834',
      own_message: '8b717d0a9142e697cafd342c8f79f042c47a9e712e8a61b6',
      type: 1,
    },
  },
  recipientId: 'U12605277787100066317',
  senderId: 'U8084717991279447871',
  senderPublicKey:
    '09c93f2667728c62d2279bbb8df34c3856088290167f557c33594dc212da054a',
  signature:
    '304a4cb7e11651d576e2c4dffb4100bef5385981807f18c3267c863daf60bd277706e6790157beacf5100c77b6798c4725f2f4e070ca78496ff53a4c2e437f02',
});

// Transaction id: 5505818610983968576
console.log(`Transaction id: ${id}`);
```

You can run this end to end with the bundled example on Node.js 22 or newer:

```sh
pnpm build
node --experimental-strip-types examples/getId/index.mts
```
