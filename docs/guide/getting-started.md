# Getting Started

`adamant-api` is the TypeScript/Node.js SDK for the ADAMANT blockchain. It
provides resilient ADM node access, account and transaction primitives,
encrypted messaging, WebSocket subscriptions, and deterministic helpers for
supported external wallets.

This is the convenient way to interact with the ADAMANT blockchain for
JavaScript and TypeScript developers. See also the
[ADAMANT Node Direct API](https://docs.adamant.im) and the
[information for developers](https://adamant.im/devs/).

## Requirements

- Node.js 22 or newer
- npm, pnpm, or another package manager supported by your project

## Installation

```sh
npm install adamant-api
```

## Quick start

The package root and `adamant-api/adm` expose ADM functionality and shared
metadata. Importing either entry point does not load coin-specific
implementations.

```ts
import {AdamantApi} from 'adamant-api';

const api = new AdamantApi({
  nodes: [
    'http://localhost:36666',
    'https://endless.adamant.im',
    'https://clown.adamant.im',
    'https://lake.adamant.im',
  ],
  checkHealthAtStartup: true,
  minVersion: '0.8.0',
});

api.onReady(async () => {
  const response = await api.getBlocks();

  if (response.success) {
    console.log(response.blocks);
  } else {
    console.error(response.errorMessage);
  }
});
```

`minVersion` is inclusive. During health checks, nodes below this ADAMANT Node
version are reported and excluded from API and WebSocket selection.

CommonJS remains supported:

```js
const {AdamantApi} = require('adamant-api');
```

::: danger SECURITY
Never place a passphrase, private key, decrypted message, or sensitive token in
logs.
:::

## Where to next

- [Library Initialization](./library-initialization) — full configuration options
- [Error Handling](./error-handling) — handle validation, node, and network failures
- [Modular Imports](./modular-imports) — pick the narrowest entry point
- [ADM Key Pairs](./adm-key-pairs) — create accounts and derive keys
- [Forming & Signing Transactions](./transactions) — build and sign transactions
- [WebSocket Connections](./websocket) — subscribe to incoming transactions
- [API Reference](/api/) — full generated reference for every export
