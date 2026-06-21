# Modular Imports

Use the narrowest entry point that fits the task. ADM-only entry points never
load or bundle coin-specific implementations.

| Entry point                | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| `adamant-api`              | ADM API and shared metadata                             |
| `adamant-api/adm`          | Explicit ADM-only SDK surface                           |
| `adamant-api/api`          | ADM HTTP client and generated API DTOs                  |
| `adamant-api/transactions` | ADM transaction construction, hashing, signing, and IDs |
| `adamant-api/metadata`     | Bundled ADM and coin metadata                           |
| `adamant-api/coins/btc`    | Bitcoin wallet helper                                   |
| `adamant-api/coins/eth`    | Ethereum wallet helper                                  |
| `adamant-api/coins/dash`   | Dash wallet helper                                      |
| `adamant-api/coins/doge`   | Dogecoin wallet helper                                  |

For example:

```ts
import {btc} from 'adamant-api/coins/btc';

const wallet = btc.keys('your twelve-word ADM passphrase');
const valid = btc.isValidAddress(wallet.address ?? '');
```

The external coin scope is intentionally limited to metadata, deterministic
key/address derivation, and address validation. Balance lookup, history, fees,
external-chain signing, and broadcasting are not part of this SDK surface.

See [External Coin Wallets](./external-coins) for per-coin details.
