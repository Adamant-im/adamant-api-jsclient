# Library Initialization

Install the library using `npm` or any other Node.js package manager:

```sh
npm install adamant-api
```

Initialize the library by passing a list of ADAMANT nodes and, optionally, a
logger. It is good practice to initialize the API in a separate module
(`api.js`) and refer to it elsewhere.

```ts
// api.js
import {AdamantApi} from 'adamant-api';
import {customLogger} from './logger.js';

const nodes = [
  'http://localhost:36666',
  'https://endless.adamant.im',
  'https://clown.adamant.im',
  'https://lake.adamant.im',
];

const api = new AdamantApi({
  /**
   * List of nodes you would like to connect to. Required.
   */
  nodes,

  /**
   * By default, adamant-api considers a node unavailable if it does not respond
   * within the timeout. Set it in milliseconds. Use 0 for an infinite wait.
   */
  timeout: 10_000, // default is `5000` (5 seconds)

  /**
   * How many retries the library should perform before giving up on a request.
   */
  maxRetries: 5, // default is `3`

  /**
   * Whether the API should check nodes at startup and periodically afterwards.
   */
  checkHealthAtStartup: false, // default is `true`

  /**
   * Minimum ADAMANT Node version (inclusive). During health checks, nodes
   * running an older version are reported and excluded from both API and
   * WebSocket selection. Omit to accept any version.
   */
  minVersion: '0.8.0', // default is unset

  /**
   * 'none' (-1) < 'error' (0) < 'warn' (1) < 'info' (2) < 'log' (3)
   * < 'debug' (4). Only 'none' disables logging. Unknown names such as
   * 'trace' fall back to 'log'.
   */
  logLevel: 'info', // default is `3` ('log')

  /**
   * Custom logger. MUST implement `error`, `warn`, `info`, and `log` methods.
   * `debug` is optional and falls back to `log` when omitted.
   */
  logger: customLogger, // default is `console`
});

api.onReady(() => {
  console.log('ADAMANT API is ready to use!');
});

export {api};
```

## Log levels

The SDK supports `none`, `error`, `warn`, `info`, `log`, and `debug`. Only
`none` (or `LogLevel.None`) disables logging completely. The default is `log`;
use `debug` for verbose diagnostic messages such as received WebSocket
transaction directions.

Applications sometimes pass their own logger level names through shared
configuration. Unknown string values such as `trace` safely fall back to `log`
instead of disabling output.

```ts
new AdamantApi({nodes, logger, logLevel: 'none'}); // no SDK logs
new AdamantApi({nodes, logger, logLevel: 'debug'}); // verbose SDK diagnostics
```

Then refer to the API module from your other modules:

```ts
// blocksChecker.js
import {api} from './api.js';

const response = await api.getBlocks();

if (response.success) {
  console.log(response.blocks);
}
```

See [WebSocket Connections](./websocket) to learn more about WebSocket
subscriptions in `adamant-api`. For the full list of constructor options and
methods, see the [API Reference](/api/).
