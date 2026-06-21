# Error Handling

ADAMANT API methods use a discriminated result instead of throwing for expected
validation, node, and transport failures:

```ts
type AdamantApiResult<T> =
  | (Omit<T, 'success'> & {success: true})
  | {success: false; errorMessage: string};
```

Always check `success` before reading response data:

```ts
const response = await api.getBlocks();

if (response.success) {
  console.log(response.blocks);
} else {
  console.error(response.errorMessage);
}
```

## One error field

Every SDK result with `success: false` uses `errorMessage`. This includes:

- local input validation failures;
- unsuccessful ADAMANT Node responses;
- HTTP and network failures;
- the absence of a node compatible with the configured `minVersion`.

Some ADAMANT Node versions return unsuccessful HTTP responses using `error` or
`message`. The SDK normalizes these node-specific fields to `errorMessage`, so
applications do not need fallbacks such as
`response.errorMessage || response.error`.

## Errors and exceptions

Expected operational failures resolve to `{success: false, errorMessage}`.
Unexpected programming or runtime errors can still reject a promise or throw,
so applications may place calls inside a boundary-level `try`/`catch` when
they need to keep a long-running worker alive:

```ts
try {
  const response = await api.getTransactions({limit: 100});

  if (!response.success) {
    logger.warn(`Unable to retrieve ADM transactions: ${response.errorMessage}`);
    return;
  }

  processTransactions(response.transactions);
} catch (error) {
  logger.error('Unexpected ADM transaction checker failure', error);
}
```

Do not log passphrases, private keys, decrypted messages, or sensitive tokens
when reporting an error.

## Retries

Safe GET failures may be retried against another healthy node. A POST request
is retried only when no HTTP response was received; an explicitly rejected POST
is not replayed because doing so could submit a transaction twice.

See [Reliability](./reliability) for node selection and retry details.
