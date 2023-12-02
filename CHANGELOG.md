# Changelog

## [2.2.0] - 2023-12-01

## Added

- Export validator utils:

  ```ts
  function isPassphrase(passphrase: unknown): passphrase is string;
  function isAdmAddress(address: unknown): address is AdamantAddress;
  function isAdmPublicKey(publicKey: unknown): publicKey is string;
  function isAdmVoteForPublicKey(publicKey: unknown): publicKey is string;
  function isAdmVoteForAddress(address: unknown): boolean;
  function isAdmVoteForDelegateName(delegateName: unknown): delegateName is string;
  function validateMessage(
    message: string,
    messageType: MessageType = MessageType.Chat
  ): { success: false, error: string } | { success: true };
  function isDelegateName(name: unknown): name is string;
  function admToSats(amount: number): number;
  ```

## [2.1.0] - 2023-11-17

### Added

- `api.initSocket()` now accepts an instance of `WebSocketClient` as an argument:

  ```js
  const socket = new WebSocketClient({ /* ... */ })

  api.initSocket(socket)
  // instead of
  api.socket = socket
  ```

- Improved the `encodeMessage()` and `decodeMessage()` functions to accept public keys as Uint8Array or Buffer

  ```js
  import {encodeMessage, createKeypairFromPassphrase} from 'adamant-api'

  const {publicKey} = createKeypairFromPassphrase('...')
  const message = encodeMessage(,, publicKey) // No need to convert public key to string
  ```

- `decodeMessage()` allows passing a key pair instead of a passphrase:

  ```js
  import {decodeMessage, createKeypairFromPassphrase} from 'adamant-api'

  const keyPair = createKeypairFromPassphrase('...')
  const message = decodeMessage(,, keyPair,) // <- It won't create a key pair from passphrase again
  ```

- TypeScript: Export transaction handlers TypeScript utils: `SingleTransactionHandler`, `AnyTransactionHandler`, `TransactionHandler<T extends AnyTransaction>`

### Fixed

- TypeScript: Fixed typing for `AdamantApiOptions` by adding `LogLevelName` as possible value for `logLevel` property.

  For example, you can now use `'log'` instead of `LogLevel.Log` in TypeScript:

  ```ts
  const api = new AdamantApi({ /* ... */ logLevel: 'log' })
  ```

- TypeScript: Added missing declaration modules to npm that led to the error:

  ```
  Could not find a declaration file for module 'coininfo'.
  /// <reference path="../../types/coininfo.d.ts" />
  ```

- TypeScript: `amount` property in `ChatTransactionData` (`createChatTransaction()` argument) is now truly optional:

  ```diff
  -  amount: number | undefined;
  +  amount?: number;
  ```

## [2.0.0] - 2023-10-12

### Added

- **TypeScript support**

  The project was fully rewritten in TypeScript, which means it supports typings now.

  _See [examples](./examples/) directory._

- **More API methods**

  Added more API methods:

  ```js
  // before
  const block = await api.get('blocks/get', { id });

  // after
  const block = await api.getBlock(id);
  ```

  and `post()` method:

  ```js
  await api.post('transactions/process', { transaction });
  ```


- **getTransactionId()** method

  Pass signed transaction with signature to get a transaction id as a string:

  ```js
  import {getTransactionId} from 'adamant-api'
  const id = getTransactionId(signedTransaction)
  ```

  _See [documentation](https://github.com/Adamant-im/adamant-api-jsclient/wiki/Calculating-transaction-id) for more information._

### Fixed

- **Creating multiple instances**

  Previously, it was not possible to create multiple instances due to the storage of Logger and "Node Manager" data in the modules.

- **Importing module several times**

  Fixed a bug where importing adamant-api-jsclient caused issues when it was also imported as a dependency.

### Changed

- **API Initialization**

  Now you will create new instances of `adamant-api` using keyword `new`:

  ```js
  import { AdamantApi } from 'adamant-api';

  const api = new AdamantApi({ nodes: [/* ... */] });
  ```

- **Socket Initialization**

  Replace `api.socket.initSocket()` with `api.initSocket()`.

  Use `api.socket.on()` instead of `.initSocket({ onNewMessage() {} })`.

  ```ts
  // before
  api.socket.initSocket({
    admAddress: 'U1234..',
    onNewMessage(transaction) {
      // ...
    },
  });

  // after
  api.initSocket({ admAddress: 'U1234..' });

  api.socket.on((transaction: AnyTransaction) => {
    // ...
  });
  ```

  Or specify `socket` option when initializing API:

  ```ts
  // socket.ts
  import { WebSocketClient, TransactionType } from 'adamant-api';

  const socket = new WebSocketClient({ admAddress: 'U1234..' });

  socket.on([TransactionType.CHAT_MESSAGE, TransactionType.SEND], (transaction) => {
    // handle chat messages and transfer tokens transactions
  });

  socket.on(TransactionType.VOTE, (transaction) => {
    // handle vote for delegate transaction
  });

  export { socket };
  ```

  ```ts
  // api.ts
  import { AdamantApi } from 'adamant-api';
  import { socket } from './socket';

  export const api = new AdamantApi({
    socket,
    nodes: [/* ... */],
  });
  ```

### Removed

- `createTransaction()`

  Use `createSendTransaction`, `createStateTransaction`, `createChatTransaction`, `createDelegateTransaction`, `createVoteTransaction` methods instead.
