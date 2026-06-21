# Reliability

`AdamantApi` checks configured nodes through the node status endpoint and
selects a live node at an actual blockchain height. Safe GET failures can be
retried against another healthy node. POST requests are retried only when no
HTTP response was received; an explicitly rejected POST is never replayed
automatically, avoiding pointless retries for validation errors.

Applications should provide several independently operated HTTPS nodes and
handle returned errors. Malformed responses, timeouts, and partial network
outages must not be treated as successful requests.

## Health checks and node selection

- Nodes are probed via `/api/node/status`, which since ADAMANT Node v0.9.0
  exposes a `loader` sub-object that merges the previously separate
  `/api/loader/status` and `/api/loader/status/sync` data, reducing the number
  of health-check requests.
- Nodes below `minVersion` (inclusive) are reported and excluded from both API
  and WebSocket selection.
- Node selection is height-aware: nodes that lag behind the network's actual
  height are not used.

## Retries

- **GET** requests are safe to retry, and a failure on one node can be retried
  against another healthy node.
- **POST** requests are retried only when no HTTP response was received. A POST
  that received an explicit (4xx, or semantic 5xx) rejection is not replayed —
  this avoids endlessly retrying requests rejected for invalid input.

See the [API Reference](/api/) for the `maxRetries`, `timeout`, and
`checkHealthAtStartup` options.
