# Changelog

## [Unreleased]

## [2.0.0] - 2023-10-12

### Added

- **TypeScript support**

  The project was fully rewritten in TypeScript, which means it supports typings now.

  _See [examples](./examples/) directory._

- **More API methods**

  Added more API methods:

  ```js
  // before
  const block = await api.get('blocks/get', { id })

  // after
  const block = await api.getBlock(id)
  ```

  and `post()` method:

  ```js
  await api.post('transactions/process', { transaction })
  ```

## Fixed

- **Creating multiple instances**

  Previously, it was not possible to create multiple instances due to the storage of Logger and "Node Manager" data in the modules.

- **Importing module several times**

  Fixed a bug where importing adamant-api-jsclient caused issues when it was also imported as a dependency.

### Changed

- **API Initialization**

  Now you will create new instances of `adamant-api` using keyword `new`:

  ```js
  import { AdamantApi } from 'adamant-api'

  const api = new AdamantApi({ nodes: [/* ... */] })
  ```

- **Socket Initialization**

  Use `api.initSocket()` instead of `api.socket.initSocket()`:

  ```ts
  // before
  api.socket.initSocket({
    admAddress: 'U1234..',
    onNewMessage(transaction) {
      // ...
    }
  })

  // after
  api.initSocket({
    admAddress: 'U1234..',
    onNewMessage(
      transaction:
        | ChatMessageTransaction
        | TokenTransferTransaction
    ) {
      // ...
    }
  })
  ```

  or specify `socket` option when initializing API:

  ```js
  // socket.js
  import { WebSocketClient } from 'adamant-api'

  export const socket = new WebSocketClient(
    // same options as for api.initSocket()
  );
  ```

  ```js
  // api.js
  import { AdamantApi } from 'adamant-api'
  import { socket } from './socket.js'

  export const api = new AdamantApi({
    socket,
    nodes: [/* ... */]
  })
  ```

### Removeed

- `createTransaction()`

  Use `createSendTransaction`, `createStateTransaction`, `createChatTransaction`, `createDelegateTransaction`, `createVoteTransaction` methods instead.
