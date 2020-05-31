# ADAMANT JavaScript API library

ADAMANT JavaScript API is a library intended to interact with ADAMANT blockchain for Node.js developers. Also [ADAMANT Console](https://github.com/Adamant-im/adamant-console/wiki) and [ADAMANT node Direct API](https://github.com/Adamant-im/adamant/wiki/) are available.

Abilities:

* Internal Health Check for ADAMANT nodes. Health Check system pings all nodes in the list using [`/status`](https://github.com/Adamant-im/adamant/wiki/API-Specification#get-blockchain-and-network-status) endpoint, and connect to a node with actual height.
* Encrypting and decrypting of messages
* Forming and signing transactions
* Working with ADM key pairs
* Generating ETH crypto address and keys, bound to ADM account
* Working with ADAMANT epoch time
* Support for WebSocket connections
* Logging warnings, errors, info

# Usage

Add current version of ADAMANT JavaScript API library in project's `package.json` in `dependencies` section like this:

``` json
  "dependencies": {
    "adamant-api": "^0.5.3",
    ...
```

Or install library from npm:

``` bash
npm i adamant-api
```

# Documentation 

See [Wiki](https://github.com/Adamant-im/adamant-api-jsclient/wiki) for documentation and usage.
