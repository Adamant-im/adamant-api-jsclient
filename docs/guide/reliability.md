# Reliability

`AdamantApi` checks configured nodes through the node status endpoint and
selects a live node at an actual blockchain height. Safe GET failures can be
retried against another healthy node. POST requests are retried only when no
HTTP response was received; an explicitly rejected POST is never replayed
automatically, avoiding pointless retries for validation errors.

Applications should provide several independently operated HTTPS nodes and
handle returned errors. Malformed responses, timeouts, and partial network
outages must not be treated as successful requests.

All expected failures use the normalized
`{success: false, errorMessage: string}` result. See
[Error Handling](./error-handling) for the complete contract and examples.

## Health checks and node selection

- Nodes are probed via `/api/node/status`, which since ADAMANT Node v0.9.0
  exposes a `loader` sub-object that merges the previously separate
  `/api/loader/status` and `/api/loader/status/sync` data, reducing the number
  of health-check requests.
- Nodes below `minVersion` (inclusive) are reported and excluded from both API
  and WebSocket selection.
- A node that reports `loader.loaded: false` or `loader.syncing: true` is not
  an active node. Status responses without a `loader` object stay eligible, so
  older nodes that do not send it can still be selected.
- Node selection is height-aware: nodes that lag behind the network's actual
  height are not used.
- `onReady` runs only after a usable node is selected. It does not run when
  every node is unavailable, below `minVersion`, or still loading or syncing.
  The next periodic health check runs the callback once such a node appears.
  With `checkHealthAtStartup: false`, selection is skipped and `onReady` runs
  immediately.

## Retries and rate limits

- **Idempotent reads (`GET` and `getKVS(..., {method: 'POST'})`)** are safe to
  retry: transport failures and unstructured 5xx responses refresh nodes and
  retry against another healthy node. Forced failovers rotate away from the
  failed node across both 2-node and 3+-node synced sets, and concurrent
  requests share a single in-flight health sweep rather than running duplicate
  sweeps or flipping back to the failed node.
- **HTTP `429 Too Many Requests`** (enabled by default in ADAMANT Node
  `v0.11.0`): the SDK records a per-node cooldown (capped at 60 seconds) so
  subsequent forced and planned health checks prefer non-rate-limited synced
  nodes even though `/api/node/status` uses a separate `status` bucket. For
  idempotent reads, the SDK fails over immediately when another synced node is
  available; if the active node remains the same (for example, in a single-node
  configuration), it honors `Retry-After` / `RateLimit-Reset` with jitter up to
  a bounded 10-second wait and otherwise returns the normalized error promptly
  with `status: 429`, `retryAfterMs`, and `rateLimitScope` so callers can
  schedule retries cleanly.
- **Write `POST` requests** are retried only when no HTTP response was
  received. A write `POST` that received an explicit (4xx, including `429`, or
  semantic 5xx) rejection is not replayed automatically — this avoids endlessly
  retrying invalid input or duplicating transactions.

See the [API Reference](/api/) for the `maxRetries`, `timeout`, and
`checkHealthAtStartup` options.
