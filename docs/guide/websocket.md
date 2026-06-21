# WebSocket Connections

To use WebSocket subscriptions, create a `WebSocketClient` and attach it to your
API instance:

```ts
// socket.js
import {WebSocketClient} from 'adamant-api';

const ws = new WebSocketClient({
  /* options */
});

export {ws};
```

```ts
// api.js
import {AdamantApi} from 'adamant-api';
import {ws} from './socket.js';

const api = new AdamantApi({
  /* options */
});

api.initSocket(ws); // WebSocket initialization

export {api};
```

## Options

```ts
type WsType = 'ws' | 'wss';

interface WsOptions {
  /** ADM address to subscribe to transactions. */
  admAddress?: AdamantAddress;

  /** Multiple ADM addresses to subscribe to transactions. */
  admAddresses?: AdamantAddress[];

  /** Transaction types to subscribe to. */
  types?: number[];

  /** Message (chat asset) types to subscribe to. */
  assetChatTypes?: number[];

  /** Websocket type: `'wss'` or `'ws'`. `'wss'` is recommended. */
  wsType?: WsType;

  /**
   * Connect to the node with the lowest ping. Not recommended.
   * Default is `false`.
   */
  useFastest?: boolean;

  /**
   * Max attempts to reconnect to the websocket. Until the connection is
   * established, transactions are pulled from the node's REST API.
   * Default is `3`.
   */
  maxTries?: number;

  /** Delay before reconnection, in ms. Default is `5000`. */
  reconnectionDelay?: number;

  /** Logger for websocket events. Default logger is `console`. */
  logger?: Logger | null;
}
```

Example:

```ts
const ws = new WebSocketClient({admAddress: 'U1234567890', useFastest: true});
```

## Connection lifecycle

### `.connect()` / `.disconnect()`

Open and close the underlying socket connection explicitly.

```ts
ws.connect();
ws.disconnect();
```

### `.onConnection()`

Adds an event listener for the initial connection.

```ts
type ConnectionHandler = (connectedNode: string) => void;
function onConnection(callback: ConnectionHandler): this;
```

```ts
// wss://clown.adamant.im:36665
ws.onConnection(connectedNode => console.log(connectedNode));
```

### `.onReconnection()`

Adds an event listener for reconnection. The node never changes when
reconnecting if `options.useFastest` is `true`.

```ts
function onReconnection(callback: ConnectionHandler): this;
```

```ts
// wss://endless.adamant.im:36665
ws.onReconnection(connectedNode => console.log(connectedNode));
```

### `.catch()`

Sets an error handler for all event handlers and disconnection errors.

```ts
function catch(callback: ErrorHandler): this;
```

Handling a middleware error:

```ts
ws.onMessage(() => {
  throw new Error('catch me');
});

ws.catch(error => {
  console.log(error); // Error: catch me
});
```

Handling a disconnection error:

```ts
ws.catch(error => {
  if (error.name === 'AdamantWsConnectionError') {
    const errorMessages = {
      connection_error: 'Connection error',
      disconnection: 'Disconnected',
    };

    console.log(errorMessages[error.reason]);
  } else {
    // Other errors
  }
});
```

## Subscribing to transactions

### `.on()`

Adds a handler for all transaction types, or for specific transaction types.

```ts
function on(handler: AnyTransactionHandler): this;
function on<T extends EventType>(
  types: T | T[],
  handler: TransactionHandler<TransactionMap[T]>
): this;
```

```ts
import {TransactionType} from 'adamant-api';

// All transactions
ws.on(genericTransactionHandler);

// Specific transaction type
ws.on(TransactionType.SEND, sendTransactionHandler);
```

### `.off()`

Removes a handler from all types.

```ts
function off(handler: SingleTransactionHandler): this;
```

```ts
function myFunction() {
  console.log('Hello!');
  ws.off(myFunction);
}

ws.on(myFunction);
```

### `.onMessage()`

Registers a handler for Chat Message transactions. You may optionally filter by
[message type](./transactions#createchattransaction).

```ts
function onMessage(handler: TransactionHandler<ChatMessageTransaction>): this;
function onMessage(
  messageTypes: MessageType | MessageType[],
  handler: TransactionHandler<ChatMessageTransaction>
): this;
```

```ts
ws.onMessage(chatMessageHandler);
```

Convenience helpers for specific message types:

```ts
ws.onChatMessage(handler); // MessageType.Chat
ws.onRichMessage(handler); // MessageType.Rich
ws.onSignalMessage(handler); // MessageType.Signal
```

### Other transaction helpers

```ts
ws.onTransfer(tokenTransferHandler); // Token Transfer
ws.onNewDelegate(registerDelegateHandler); // Register Delegate
ws.onVoteForDelegate(voteForDelegateHandler); // Vote for Delegate
ws.onKVS(kvsHandler); // Key-Value Store
```

For the full, generated type signatures, see the [API Reference](/api/).
