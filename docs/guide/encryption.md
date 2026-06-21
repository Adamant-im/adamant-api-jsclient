# Encrypting and Decrypting Messages

[Messages](https://github.com/Adamant-im/adamant/wiki/Message-Types) and
[KVS records](https://github.com/Adamant-im/adamant/wiki/Storing-Data-in-KVS)
are encrypted using Curve25519, Salsa20, and Poly1305
([NaCl box](https://nacl.cr.yp.to/box.html) and
[NaCl secretbox](https://nacl.cr.yp.to/secretbox.html) cipher algorithms
respectively), packed into transactions, [signed](./transactions), and
broadcast to the ADAMANT network.

The library offers the following methods to encrypt and decrypt messages and
KVS records:

- [`decodeMessage()`](#decodemessage)
- [`encodeMessage()`](#encodemessage)

Further reading:

- [Encrypting and Decrypting Messages — details](https://github.com/Adamant-im/adamant/wiki/Encrypting-and-Decrypting-Messages)
- [Encryption overview in ADAMANT Messenger](https://medium.com/adamant-im/encryption-overview-in-adamant-messenger-878ecec1ff78)

## `decodeMessage()`

Decrypts a message or KVS record retrieved from the ADAMANT blockchain.

```ts
function decodeMessage(
  message: string,
  senderPublicKey: Uint8Array | string,
  keyPairOrPassphrase: string | KeyPair,
  nonce: string
): string;
```

- `message` — message to decrypt
- `senderPublicKey` — sender's public key
- `keyPairOrPassphrase` — recipient's 12-word ADAMANT passphrase, or key pair
- `nonce` — nonce

**Returns** the decrypted message, or an empty string if it cannot be decrypted.
**Throws** when passed an invalid parameter.

```ts
import {decodeMessage} from 'adamant-api';

import {config} from './config.js';
import {api} from './api.js';

const response = await api.getTransaction('12154642911137703318', {
  returnAsset: 1,
});

if (response.success) {
  const {asset, senderPublicKey} = response.transaction;
  const {message, own_message} = asset.chat;

  const decodedMessage = decodeMessage(
    message,
    senderPublicKey,
    config.passphrase,
    own_message
  );

  console.log(decodedMessage);
}
```

## `encodeMessage()`

Encodes a message or KVS record.

::: tip
You do NOT need to encrypt a message when using
[`sendMessage()`](/api/) — it encrypts the message by default.
:::

```ts
function encodeMessage(
  message: string,
  keypair: KeyPair,
  recipientPublicKey: Uint8Array | string
): {message: string; own_message: string};
```

- `message` — message to encrypt
- `keypair` — sender's public and private keys
- `recipientPublicKey` — recipient's public key

**Returns** an object with the encrypted `message` and the nonce `own_message`.

```ts
import {
  encodeMessage,
  createNewPassphrase,
  createKeypairFromPassphrase,
} from 'adamant-api';
import {api} from './api.js';

const passphrase = createNewPassphrase();
const keypair = createKeypairFromPassphrase(passphrase);

const recipientPublicKey = await api.getPublicKey('U1234...');

const encodedMessage = encodeMessage(
  'Hello, world!',
  keypair,
  recipientPublicKey
);
console.log(encodedMessage);
```
