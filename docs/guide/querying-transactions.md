# Querying Transactions

This page covers query options that changed or were added with ADAMANT Node
`v0.10.0`: multi-type filtering, unconfirmed transactions, and direct transfers
in chats. For every method and option type, see the [API Reference](/api/).

## Filtering by multiple transaction types

`getTransactions()` accepts a single `type` or, since `v0.10.0`, an array of
`types`:

```ts
import {TransactionType} from 'adamant-api';
import {api} from './api.js';

// A single type
const transfers = await api.getTransactions({type: TransactionType.SEND});

// Multiple types in one request
const activity = await api.getTransactions({
  types: [TransactionType.SEND, TransactionType.CHAT_MESSAGE],
});
```

## Unconfirmed transactions

By default, endpoints return only confirmed transactions. Pass
`returnUnconfirmed: 1` to include transactions that are still in the queue:

```ts
const response = await api.getTransactions({
  recipientId: 'U123...',
  returnUnconfirmed: 1,
});
```

::: warning Unconfirmed transactions have null block fields
An unconfirmed transaction has no block yet, so these fields are explicitly
nullable / zero — guard for them before use:

- `blockId` is `null`
- `height` is `null`
- `confirmations` is `0`
:::

```ts
if (response.success) {
  for (const tx of response.transactions) {
    if (tx.blockId === null) {
      console.log(`Pending: ${tx.id}`);
    } else {
      console.log(`Confirmed in block ${tx.blockId} (${tx.confirmations})`);
    }
  }
}
```

## Direct transfers in chats

`getChats()` and `getChatMessages()` accept `includeDirectTransfers` to control
whether plain token transfers (transfers without a message) appear alongside
chat messages:

```ts
import {api} from './api.js';

// Chat list including direct token transfers
const chats = await api.getChats('U123...', {includeDirectTransfers: true});

// Messages between two accounts, excluding direct transfers
const messages = await api.getChatMessages('U123...', 'U456...', {
  includeDirectTransfers: false,
});
```

::: danger Deprecated: `withoutDirectTransfers`
The previous `withoutDirectTransfers` filter is **deprecated**. Using it logs a
deprecation warning. Replace it with `includeDirectTransfers` (note the inverted
meaning):

```ts
// Before
api.getChats('U123...', {withoutDirectTransfers: true});

// After — inverted boolean
api.getChats('U123...', {includeDirectTransfers: false});
```

:::

## Sorting and the `count` field

Since `v0.10.0`:

- Endpoints sort by `timestamp:desc` by default, with the millisecond-precision
  `timestampMs` prioritized when present. See
  [Millisecond-precision timestamps](./transactions#millisecond-precision-timestamps).
- The `count` field is always returned as a `number` (previously it was
  sometimes a string), so it is safe to use in arithmetic without coercion.
