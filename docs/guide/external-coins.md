# External Coin Wallets

ADAMANT lets you
[store and send other cryptocurrencies in-chat](https://docs.adamant.im/essentials/storing-data-in-kvs.html).
Their addresses and private keys are derived deterministically from the
account's ADM key pair. The library provides per-coin modules through dedicated
subpath imports.

::: info SCOPE
The external coin scope is intentionally limited to metadata, deterministic
key/address derivation, and address validation. Balance lookup, history, fees,
external-chain signing, and broadcasting are **not** part of this SDK surface.
:::

Supported coins: **Bitcoin (BTC)**, **Ethereum (ETH)**, **Dash (DASH)**, and
**Dogecoin (DOGE)**. Each is imported from its own entry point so ADM-only
consumers never bundle coin code:

```ts
import {btc} from 'adamant-api/coins/btc';
import {eth} from 'adamant-api/coins/eth';
import {dash} from 'adamant-api/coins/dash';
import {doge} from 'adamant-api/coins/doge';
```

See also [Working with ADM Key Pairs](./adm-key-pairs).

::: danger SECURITY
The derived private keys are secrets. Never log them or expose them.
:::

## Ethereum

```ts
import {eth} from 'adamant-api/coins/eth';
```

### `keys()`

Generates an ETH address and private key from an ADAMANT passphrase.

```ts
function keys(passphrase: string): {
  address: string;
  privateKey: string;
};
```

```ts
import {eth} from 'adamant-api/coins/eth';

const {address} = eth.keys(process.env.PASSPHRASE);
console.log(`Your eth address: ${address}`);
```

## Bitcoin

```ts
import {btc} from 'adamant-api/coins/btc';
```

### `keys()`

Generates a BTC address and private key from an ADAMANT passphrase.

```ts
function keys(passphrase: string): {
  network: Network;
  keyPair: ECPairInterface;
  address: string | undefined;
  privateKey: string | undefined;
  privateKeyWIF: string;
};
```

- `address` — **P2PKH** Bitcoin address bound to the ADAMANT account.
- `keyPair` — `ECPair` key pair.
- `privateKey` — regular 256-bit (32 bytes, 64 chars) private key.
- `privateKeyWIF` —
  [Wallet Import Format](https://en.bitcoin.it/wiki/Wallet_import_format)
  (52 base58 chars).
- `network` — `coininfo` network info.

```ts
import {btc} from 'adamant-api/coins/btc';

const {address} = btc.keys(process.env.PASSPHRASE);
console.log(`Your bitcoin address: ${address}`);
```

### `isValidAddress()`

Checks whether a string is a valid Bitcoin address in **any** format.

```ts
function isValidAddress(address: string): boolean;
```

```ts
import {btc} from 'adamant-api/coins/btc';

if (btc.isValidAddress('13rK42XbSJV9BdvKQvDJeH3n45zNBbXsUV')) {
  console.log('This address is valid.');
}
```

## Dash

```ts
import {dash} from 'adamant-api/coins/dash';
```

### `keys()`

Generates a DASH address and private key from an ADAMANT passphrase. Returns the
same shape as [`btc.keys()`](#keys-1).

```ts
import {dash} from 'adamant-api/coins/dash';

const {address} = dash.keys(process.env.PASSPHRASE);
console.log(`Your dash address: ${address}`);
```

### `isValidAddress()`

```ts
import {dash} from 'adamant-api/coins/dash';

if (dash.isValidAddress('XdY9tHBVQ1hjLaWuGoXXVojZtRa4GfEdNP')) {
  console.log('This address is valid.');
}
```

## Doge

```ts
import {doge} from 'adamant-api/coins/doge';
```

### `keys()`

Generates a DOGE address and private key from an ADAMANT passphrase. Returns the
same shape as [`btc.keys()`](#keys-1).

```ts
import {doge} from 'adamant-api/coins/doge';

const {address} = doge.keys(process.env.PASSPHRASE);
console.log(`Your doge address: ${address}`);
```

### `isValidAddress()`

```ts
import {doge} from 'adamant-api/coins/doge';

if (doge.isValidAddress('D7zQbHUEjiPRie6v9WCsC3DNwDifUdbFdd')) {
  console.log('This address is valid.');
}
```

For the complete, generated type signatures, see the [API Reference](/api/).
