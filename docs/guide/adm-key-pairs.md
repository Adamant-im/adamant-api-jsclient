# Working with ADM Key Pairs

The library can create a new ADAMANT account — a passphrase, key pair (public
key and private key), and ADAMANT address. Read more
[about ADAMANT accounts and key pairs](https://github.com/Adamant-im/adamant/wiki/Generating-ADAMANT-account-and-key-pair).

- [`createNewPassphrase()`](#createnewpassphrase)
- [`makeKeypairFromHash()`](#makekeypairfromhash)
- [`createHashFromPassphrase()`](#createhashfrompassphrase)
- [`createKeypairFromPassphrase()`](#createkeypairfrompassphrase)
- [`createAddressFromPublicKey()`](#createaddressfrompublickey)

::: danger SECURITY
A passphrase and private key are secrets. Never log them, store them in plain
text, or transmit them.
:::

## `createNewPassphrase()`

Generates a new mnemonic passphrase consisting of English words.

```ts
function createNewPassphrase(): string;
```

**Returns** a new, randomly generated passphrase.

```ts
import {createNewPassphrase} from 'adamant-api';

const passphrase = createNewPassphrase();
console.log(passphrase); // 'apple banana...'
```

## `makeKeypairFromHash()`

Creates a pair of public and private keys from the provided hash, using Sodium
(NaCl).

```ts
function makeKeypairFromHash(hash: Buffer): {
  publicKey: Buffer;
  privateKey: Buffer;
};
```

- `hash` — SHA-256 hash of a passphrase. Use
  [`createHashFromPassphrase`](#createhashfrompassphrase) to obtain it.

```ts
import {createHashFromPassphrase, makeKeypairFromHash} from 'adamant-api';

const hash = createHashFromPassphrase('apple banana...');
const keypair = makeKeypairFromHash(hash);

console.log(keypair);
```

## `createHashFromPassphrase()`

Generates an SHA-256 hash from a given passphrase.

```ts
function createHashFromPassphrase(passphrase: string): Buffer;
```

- `passphrase` — a 12-word mnemonic passphrase.

```ts
import {createNewPassphrase, createHashFromPassphrase} from 'adamant-api';

const passphrase = createNewPassphrase();
const hash = createHashFromPassphrase(passphrase);

console.log(`hash: ${hash.toString('hex')}`);
```

## `createKeypairFromPassphrase()`

Creates public and private keys from a passphrase using Sodium (NaCl).

```ts
function createKeypairFromPassphrase(passphrase: string): {
  publicKey: Buffer;
  privateKey: Buffer;
};
```

- `passphrase` — a 12-word mnemonic passphrase.

```ts
import {createKeypairFromPassphrase} from 'adamant-api';

let keyPair;

try {
  keyPair = createKeypairFromPassphrase(process.env.PASSPHRASE);
} catch (error) {
  console.log(`❌ Invalid passphrase. Error: ${error}`);
  process.exit(-1);
}

console.log('✅ The given passphrase is valid');
```

## `createAddressFromPublicKey()`

Derives an ADAMANT address from the given public key.

```ts
function createAddressFromPublicKey(publicKey: Buffer | string): `U${string}`;
```

- `publicKey` — the public key of an account.

**Returns** the derived ADAMANT address, in the format `U123...`.

```ts
import {
  createKeypairFromPassphrase,
  createAddressFromPublicKey,
} from 'adamant-api';

const {publicKey} = createKeypairFromPassphrase(process.env.PASSPHRASE);
const address = createAddressFromPublicKey(publicKey);

console.log(`Your ADAMANT address: ${address}`);
```

For the authoritative signatures of every export, see the
[API Reference](/api/).
