# ADAMANT JavaScript API library

ADAMANT JavaScript API is a library intended to interact with ADAMANT blockchain for JavaScript developers. Also [ADAMANT Console](https://github.com/Adamant-im/adamant-console/wiki) and [ADAMANT node Direct API](https://github.com/Adamant-im/adamant/wiki/) are available.

Features:

- High reliability
- GET-requests to the blockchain
- Sending tokens
- Sending messages
- Creating a delegate
- Voting for delegates
- Caching public keys
- Encrypting and decrypting of messages
- Forming and signing transactions
- Working with ADM key pairs
- Generating crypto wallets (addresses and keys), bound to ADM account
- Working with ADAMANT epoch time
- Support for WebSocket connections
- Logging warnings, errors, info

## Reliability

JS API shows decentralization in action—if a network node cannot fulfill your request, the library will redirect it to another node, and so on several times. You will get the result and you do not need to think about processing the request.

Health Check system pings all nodes in the list using [`/status`](https://github.com/Adamant-im/adamant/wiki/API-Specification#get-blockchain-and-network-status) endpoint, and connects to a node with actual height. When the library unable to process request with current node, it forces to re-initialize Health Check.

## Usage

Install library from npm:

```bash
npm i adamant-api
```

Initialize the library:

```JS
const { AdamantApi } = require('adamant-api')

const nodes = [
  "http://localhost:36666",
  "https://endless.adamant.im",
  "https://clown.adamant.im",
  "http://23.226.231.225:36666",
  "http://88.198.156.44:36666",
  "https://lake.adamant.im"
];

const api = new AdamantApi({
  nodes,
});
```

Request example:

```JS
const response = await api.getBlocks()

console.log(response.data)
```

## Documentation

See [Wiki](https://github.com/Adamant-im/adamant-api-jsclient/wiki) for documentation and usage.
