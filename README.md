# ADAMANT JavaScript API library

ADAMANT JavaScript API is a library intended to interact with ADAMANT blockchain for Node.js developers. Also [ADAMANT Console](https://github.com/Adamant-im/adamant-console/wiki) and [ADAMANT node Direct API](https://github.com/Adamant-im/adamant/wiki/) available.

Abilities:

* Internal Health Check for ADAMANT nodes. Health Check system pings all nodes in the list using `status` endpoint, and connect to a node with actual height.
* Encrypting and decrypting of messages
* Forming and signing transactions
* Working with ADM key pairs
* Generating ETH crypto address and keys, binded to ADM account
* Working with ADAMANT epoch time
* Logging warnings, errors, info

# Usage

Add current version of ADAMANT JavaScript API library in project's `package.json` in `dependencies` section like this:

``` json
  "dependencies": {
    "adamant-api": "^0.2.1",
    ...
```

Or install library from npm:

```
npm i adamant-api
```

# Documentation 

See [Wiki](https://github.com/Adamant-im/adamant-api-jsclient/wiki) for documentation and usage.
