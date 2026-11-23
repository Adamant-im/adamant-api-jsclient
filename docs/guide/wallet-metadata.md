# Wallet Metadata

Bundled ADM and coin metadata is available through the `adamant-api/metadata`
entry point.

```ts
import {coinMetadata, walletMetadataSource} from 'adamant-api/metadata';

console.log(coinMetadata.ADM.decimals); // 8
console.log(walletMetadataSource.revision);
```

Metadata is generated from a pinned
[`adamant-wallets`](https://github.com/Adamant-im/adamant-wallets) revision so
updates are deterministic and reviewable:

```sh
pnpm metadata:check
pnpm metadata:sync
```

Generated ADAMANT API DTOs follow the same pinned workflow from the
[`Adamant-im/adamant` OpenAPI specification](https://github.com/Adamant-im/adamant/tree/dev/openapi)
(published at [docs.adamant.im/schema](https://docs.adamant.im/schema/)):

```sh
pnpm api-types:check
pnpm api-types:sync
```

See the [API Reference](/api/) for the exported types `CoinSymbol` and
`CoinMetadata`.
