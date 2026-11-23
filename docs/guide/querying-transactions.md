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
defaults to **`or`** for `/api/transactions` only. Versions up to `2.x` passed
top-level filters through unchanged, so on that endpoint they were
OR-combined, which surprised developers. Since **v3**, this library prefixes
top-level filters with `and:` **only when calling `/api/transactions`**
(`getTransactions`, `getTransaction`).

To restore the previous behavior for a transaction query, wrap the fields in
`or: { ... }` (see below).
:::

Pagination and control parameters are not filters. The SDK now scopes them by
endpoint: transaction controls such as `returnAsset` are sent only to
`/api/transactions`, while `includeDirectTransfers` and the deprecated
`withoutDirectTransfers` are sent only to the chat endpoints that support them.
Starting in ADAMANT Node `v0.11.0`, passing `userId` as a query parameter on
`/api/chatrooms/*` is rejected (the account address belongs in the URL path),
so the SDK strips `userId` with a warning. If plain JavaScript passes a known
control to the wrong typed method, the SDK strips it instead of constructing a
request the node rejects.

### Chat and KVS endpoints use plain filter names

`getKVS` (`/api/states/get`), `getChatTransactions` (`/api/chats/get`),
`getChats`, and `getChatMessages` (`/api/chatrooms`) combine plain filter names
with **`and`**. ADAMANT Node versions older than `v0.11.0` ignore `and:` and
`or:` prefixes on these endpoints and still answer `success: true` with
unfiltered data ([Adamant-im/adamant#277](https://github.com/Adamant-im/adamant/issues/277)),
while `v0.11.0` and newer normalize `and:` and strictly reject `or:` and
unknown query fields ([Adamant-im/adamant#294](https://github.com/Adamant-im/adamant/pull/294)).
The SDK always sends the plain names:

```ts
await api.getKVS({
  senderId: 'U16655734187932477074',
  key: 'eth:address',
  orderBy: 'timestamp:desc',
});
// GET /api/states/get?senderId=U16655734187932477074&key=eth:address&orderBy=timestamp:desc
```

For large `keyIds` or `senderIds` queries that would exceed URL length limits,
pass `{method: 'POST'}` to use `POST /api/states/get`:

```ts
await api.getKVS(
  {
    senderIds: ['U16655734187932477074', 'U15423595369615486571'],
    keyIds: ['eth:address', 'btc:address', 'doge:address'],
    toHeight: 55_000_000,
  },
  {method: 'POST'},
);
```

An explicit `and: { ... }` wrapper is accepted and flattened to those same
plain names. An `or: { ... }` wrapper is rejected with `success: false`,
because these endpoints have no `or` combiner. Plain names work identically
across every ADAMANT Node version.

### Opting into `or`

`or` is supported only by `/api/transactions`. Wrap fields in `or: { ... }` to
OR them:

```ts
// senderId === 'U111'  OR  recipientId === 'U222'
await api.getTransactions({
  or: {
    senderId: 'U111',
    recipientId: 'U222',
  },
});
```

An explicit `and: { ... }` wrapper is also supported and is equivalent to
passing those fields at the top level when the query contains only AND
conditions.

## Mixed `and` / `or` queries are flat and order-sensitive

On `/api/transactions`, the node does **not** create logical groups from the
`and: {}` and `or: {}` objects. It concatenates every condition into one flat
SQL expression in query string order:

1. The first condition's `and:` or `or:` prefix has no effect because nothing
   precedes it.
2. No parentheses are added.
3. Normal SQL precedence applies: `AND` binds tighter than `OR`.

`transformTransactionQuery()` preserves JavaScript object key insertion order,
including the order of the `and` and `or` objects. These two calls therefore
have different meanings:

```ts
// (inId = U123... AND amount >= 1) OR type IN (0, 8)
await api.getTransactions({
  and: {inId: 'U123...', minAmount: 1},
  or: {types: [TransactionType.SEND, TransactionType.CHAT_MESSAGE]},
});

// type IN (0, 8) AND inId = U123... AND amount >= 1
await api.getTransactions({
  or: {types: [TransactionType.SEND, TransactionType.CHAT_MESSAGE]},
  and: {inId: 'U123...', minAmount: 1},
});
```

The shape `(A AND B) OR C` is expressible by putting the AND conditions first.
The shape `A AND (B OR C)` is **not expressible** through this node query
language because it requires parentheses.

::: warning Mixed-query runtime warning
`getTransactions()` and `getTransaction()` log this warning at most once per
`AdamantApi` instance when OR filters are combined with explicit `and: {}`
filters or top-level filters. A top-level filter plus an `or: {}` object is
also a mixed flat query; it does not mean `A AND (B OR C)`. Split the request
or verify the exact wire order before depending on the result. Chat and KVS
methods reject `or` instead of sending it.
:::

## Filter support is endpoint-specific

Not every filter is valid on every endpoint. Pre-`v0.11.0` nodes silently
ignored unknown fields on chat and KVS endpoints, whereas ADAMANT Node
`v0.11.0` and newer **strictly reject** unsupported fields (including
`fromHeight` / `toHeight` and query `userId` on `/api/chatrooms/*`, `blockId`,
timestamp/amount/fee filters, `minConfirmations`, and misspelled `keysIds`).
The SDK models each endpoint's accepted filters with its own TypeScript option
type (`TransactionsOptions`, `ChatTransactionsOptions`, `ChatroomsOptions`, and
`KVSOptions`) so unsupported fields fail at compile time:

```ts
await api.getTransactions({minAmount: 1000}); // OK

// @ts-expect-error `/api/chats/get` does not apply amount filters
await api.getChatTransactions({minAmount: 1000});
```

| Method (endpoint)                                 | Filters the node actually applies                                                | Names sent on the wire                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| `getTransactions` (`/api/transactions`)           | the full set, including `minAmount` / `maxAmount`, `types`, height & time ranges | top-level filters as `and:`; `or` is supported |
| `getChatTransactions` (`/api/chats/get`)          | `type`, `senderId`, `recipientId`, `inId` / `isIn`, `fromHeight`, `toHeight`     | plain names; `or` is rejected                  |
| `getChats` / `getChatMessages` (`/api/chatrooms`) | `type`, `senderId`, `recipientId`, plus the direct-transfer toggle               | plain names; `or` is rejected                  |
| `getKVS` (`/api/states/get`, `GET` or `POST`)     | `type`, `key`, `keyIds`, `senderId`, `senderIds`, `fromHeight`, `toHeight`       | plain names; `or` is rejected                  |

All endpoints also accept the pagination/control options (`limit`, `offset`,
`orderBy`, `returnUnconfirmed`; `returnAsset` on `/api/transactions`). Known
control parameters from a different endpoint (including legacy `userId`) are
dropped so they cannot trigger node validation errors; the SDK warns at most
once per endpoint and parameter when this happens.

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
