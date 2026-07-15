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

Pagination and control parameters are not filters. The SDK now scopes them by
endpoint: transaction controls such as `returnAsset` are sent only to
`/api/transactions`, while `includeDirectTransfers`,
`withoutDirectTransfers`, and `userId` are sent only to the chat endpoints that
support them. If plain JavaScript passes a known control to the wrong typed
method, the SDK strips it instead of constructing a request the node rejects.

### Opting into `or`

Wrap fields in `or: { ... }` to OR them:

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

The node does **not** create logical groups from the `and: {}` and `or: {}`
objects. It concatenates every condition into one flat SQL expression in query
string order:

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
All typed query methods log a warning when OR filters are combined with
explicit `and: {}` filters or top-level filters. A top-level filter plus an
`or: {}` object is also a mixed flat query; it does not mean
`A AND (B OR C)`. Split the request or verify the exact wire order before
depending on the result.
:::

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
