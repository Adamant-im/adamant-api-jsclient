# ADAMANT JavaScript API

`adamant-api` is the TypeScript/Node.js SDK for the ADAMANT blockchain. It provides resilient ADM node access, account and transaction primitives, encrypted messaging, WebSocket subscriptions, and deterministic helpers for supported external wallets.

## Features

- Automatic ADM node health checks, retries, failover, and height-aware node selection
- Typed blockchain API requests and response DTOs
- ADM passphrase hashing, keypair and address derivation
- Message encryption and decryption
- Transaction construction, hashing, signing, and ID calculation
- WebSocket subscriptions for incoming transactions
- Optional BTC, ETH, DASH, and DOGE wallet derivation and address validation
- Pinned, reproducible schema metadata from [`adamant-schema`](https://github.com/Adamant-im/adamant-schema)
- Pinned, reproducible coin metadata from [`adamant-wallets`](https://github.com/Adamant-im/adamant-wallets)

## Requirements

- Node.js 22 or newer
- npm, pnpm, or another package manager supported by your project

## Installation

```sh
npm install adamant-api
```

## ADM API usage

The package root and `adamant-api/adm` expose ADM functionality and shared metadata. Importing either entry point does not load coin-specific implementations.

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

CommonJS remains supported:

```js
const {AdamantApi} = require('adamant-api');
```

Do not place a passphrase, private key, decrypted message, or sensitive token in logs.

## Modular imports

Use the narrowest entry point that fits the task:

| Entry point | Purpose |
| --- | --- |
| `adamant-api` | ADM API and shared metadata |
| `adamant-api/adm` | Explicit ADM-only SDK surface |
| `adamant-api/api` | ADM HTTP client and generated API DTOs |
| `adamant-api/transactions` | ADM transaction construction, hashing, signing, and IDs |
| `adamant-api/metadata` | Bundled ADM and coin metadata |
| `adamant-api/coins/btc` | Bitcoin wallet helper |
| `adamant-api/coins/eth` | Ethereum wallet helper |
| `adamant-api/coins/dash` | Dash wallet helper |
| `adamant-api/coins/doge` | Dogecoin wallet helper |

For example:

```ts
import {btc} from 'adamant-api/coins/btc';

const wallet = btc.keys('your twelve-word ADM passphrase');
const valid = btc.isValidAddress(wallet.address ?? '');
```

The external coin scope is intentionally limited to metadata, deterministic key/address derivation, and address validation. Balance lookup, history, fees, external-chain signing, and broadcasting are not part of this SDK surface.

## Wallet metadata

```ts
import {coinMetadata, walletMetadataSource} from 'adamant-api/metadata';

console.log(coinMetadata.ADM.decimals); // 8
console.log(walletMetadataSource.revision);
```

Metadata is generated from a pinned `adamant-wallets` revision so updates are deterministic and reviewable:

```sh
pnpm metadata:check
pnpm metadata:sync
```

Generated ADAMANT API DTOs follow the same pinned workflow for `adamant-schema`:

```sh
pnpm api-types:check
pnpm api-types:sync
```

## Reliability

`AdamantApi` checks configured nodes through the node status endpoint and selects a live node at an actual blockchain height. When a request fails, the client retries and can switch to another healthy node instead of depending on a single endpoint.

Applications should provide several independently operated HTTPS nodes and handle returned errors. Malformed responses, timeouts, and partial network outages must not be treated as successful requests.

## Development

```sh
corepack enable
pnpm install
pnpm build
pnpm test
pnpm test:package
pnpm lint
```

`pnpm test:package` packs the current working tree and installs its tarball into a temporary consumer project. It verifies CommonJS and ESM imports, package subpaths, runtime helpers, and TypeScript declarations without using the published npm version. Edit [`scripts/package-test/consumer.ts`](./scripts/package-test/consumer.ts) to extend the consumer scenario.

Run the deterministic transaction ID example directly on Node.js 22 or newer:

```sh
pnpm build
node --experimental-strip-types examples/getId/index.mts
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for repository conventions, testing expectations, generated files, and pull request guidance.

## Links

- [ADAMANT website](https://adamant.im/)
- [ADAMANT documentation](https://docs.adamant.im/)
- [ADAMANT Improvement Proposals](https://aips.adamant.im/all)
- [ADAMANT Node](https://github.com/Adamant-im/adamant)
- [ADAMANT API schema](https://schema.adamant.im/)
- [ADAMANT schema source](https://github.com/Adamant-im/adamant-schema)
- [ADAMANT wallet metadata](https://github.com/Adamant-im/adamant-wallets)
- [ADAMANT blockchain explorer](https://explorer.adamant.im/)
- [Package documentation and examples](https://github.com/Adamant-im/adamant-api-jsclient/wiki)
- [Changelog and releases](https://github.com/Adamant-im/adamant-api-jsclient/releases)
- [Issues and feature requests](https://github.com/Adamant-im/adamant-api-jsclient/issues)

## License

[GPL-3.0](./LICENSE)
