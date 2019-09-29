# ADAMANT JavaScript API library

ADAMANT JavaScript API is a library intended to interact with ADAMANT blockchain for Node.js developers. Also [ADAMANT Console](https://github.com/Adamant-im/adamant-console/wiki) and [ADAMANT node Direct API](https://github.com/Adamant-im/adamant/wiki/) available.

Abilities:

* Internal Health Check for ADAMANT nodes. This system ping all nodes in the list using `status` endpoint, and connect to node with actual height.
* Encrypting and decrypting of messages
* Working with ADM key pairs
* Generating ETH crypto address and keys, tied to ADM account
* Forming and signing transactions
* Working with ADAMANT epoch time
* Writing to log, 

# Usage

Add current version of ADAMANT JavaScript API library in project's `package.json` in `dependencies` section like this:

``` json
  "dependencies": {
    "adamant-api": "^0.1.22",
    ...
```

Or install library from npm:

```
npm i adamant-api
```

# Documentation 

See [Wiki](https://github.com/Adamant-im/adamant-api-jsclient/wiki) for documantation and usage.
