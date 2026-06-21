# Querying Transactions

This page covers how transaction filters are combined, plus the query options
that changed or were added with ADAMANT Node `v0.10.0`: multi-type filtering,
unconfirmed transactions, and direct transfers in chats. For every method and
option type, see the [API Reference](/api/).

## Combining filters: `and` by default

When you pass several filter conditions, `adamant-api` combines them with
**`and`** — every condition must match:

```ts
import {TransactionType} from 'adamant-api';
import {api} from './api.js';

// type === SEND  AND  recipientId === 'U123...'
const result = await api.getTransactions({
  type: TransactionType.SEND,
  recipientId: 'U123...',
  limit: 20,
  orderBy: 'timestamp:desc',
});
```

::: warning Breaking change in v3
The raw node
[query language](https://docs.adamant.im/api/transactions-query-language.html#combine-filters-and-options)
defaults to **`or`** for `/api/transactions`. Versions up to `2.x` passed
top-level filters through unchanged, so they were OR-combined, which surprised
developers. Since **v3**, this library prefixes top-level filters with `and:`
for you, so multiple conditions are AND-combined by default.

To restore the previous behavior for a query, wrap the fields in `or: { ... }`
(see below).
:::

Pagination and control parameters — `limit`, `offset`, `orderBy`,
`returnUnconfirmed`, `returnAsset`, `includeDirectTransfers`,
`withoutDirectTransfers`, and `userId` — are not filters and are always sent
as-is.

### Opting into `or`

Wrap fields in `or: { ... }` to OR them. You can mix a default-`and` top level
with an `or` group; the node ANDs the top-level conditions with the OR group:

```ts
// type === CHAT_MESSAGE  AND  (senderId === 'U111'  OR  recipientId === 'U222')
await api.getTransactions({
  type: TransactionType.CHAT_MESSAGE,
  or: {
    senderId: 'U111',
    recipientId: 'U222',
  },
});
```

An explicit `and: { ... }` wrapper is also still supported and is equivalent to
passing those fields at the top level.

## Filter support is endpoint-specific

Not every filter is valid on every endpoint. The node does not reject unknown
query fields, but each endpoint only *applies* a subset of them — passing a
filter an endpoint ignores simply has no effect. The table below was verified
against the node's per-endpoint query builders, not just the
[query-language docs](https://docs.adamant.im/api/transactions-query-language.html).

The most important difference: **amount filters (`minAmount` / `maxAmount`) are
honored only by `/api/transactions`.** The SDK enforces this at the type level,
so they are a compile error on the chat and KVS methods:

```ts
await api.getTransactions({minAmount: 1000}); // OK

// @ts-expect-error `/api/chats/get` does not apply amount filters
await api.getChatTransactions({minAmount: 1000});
```

| Method (endpoint)                                 | Filters the node actually applies                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `getTransactions` (`/api/transactions`)           | the full set, including `minAmount` / `maxAmount`, `types`, height & time ranges    |
| `getChatTransactions` (`/api/chats/get`)          | `type`, `senderId`, `recipientId`, `inId` / `isIn`, `fromHeight`                    |
| `getChats` / `getChatMessages` (`/api/chatrooms`) | `type`, `senderId`, `recipientId`, `userId`, plus the direct-transfer toggle        |
| `getKVS` (`/api/states/get`)                      | `type`, `key`, `keyIds`, `senderId`, `senderIds`, `fromHeight`                       |

All endpoints also accept the pagination/control options (`limit`, `offset`,
`orderBy`, `returnUnconfirmed`; `returnAsset` on `/api/transactions`). Beyond
the amount filters, the SDK does not strip endpoint-inappropriate fields — it
forwards what you pass, and the node ignores anything it does not apply.

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
