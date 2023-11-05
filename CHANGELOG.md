# Changelog

## [2.0.1] - 2023-11-06

### Added

- `api.initSocket()` now accepts an instance of `WebSocketClient` as an argument:

  ```js
  const socket = new WebSocketClient({ /* ... */ })

  api.initSocket(socket)
  // instead of
  api.socket = socket
  ```

- Export transaction handlers TypeScript utils: `SingleTransactionHandler`, `AnyTransactionHandler`, `TransactionHandler<T extends AnyTransaction>`

### Fixed

- Fixed typing for `AdamantApiOptions` by adding `LogLevelName` as possible value for `logLevel` property.

  For example, you can now use `'log'` instead of `LogLevel.Log` in TypeScript:

  ```ts
  const api = new AdamantApi({ /* ... */ logLevel: 'log' })
  ```

- Added missing declaration modules to npm that led to the error:

  ```
  Could not find a declaration file for module 'coininfo'.
  /// <reference path="../../types/coininfo.d.ts" />
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

  or specify `socket` option when initializing API:

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

### Removeed

- `createTransaction()`

  Use `createSendTransaction`, `createStateTransaction`, `createChatTransaction`, `createDelegateTransaction`, `createVoteTransaction` methods instead.
