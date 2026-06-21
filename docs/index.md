---
layout: home

hero:
  name: ADAMANT JS API
  text: TypeScript SDK for the ADAMANT blockchain
  tagline: Resilient node access, account and transaction primitives, encrypted messaging, WebSocket subscriptions, and deterministic wallet helpers.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: View on GitHub
      link: https://github.com/Adamant-im/adamant-api-jsclient

features:
  - title: Resilient node access
    details: Automatic ADM node health checks, retries, failover, and height-aware node selection.
    link: /guide/reliability
    linkText: Reliability
  - title: Typed API
    details: Typed blockchain API requests and response DTOs generated from adamant-schema.
    link: /api/
    linkText: API Reference
  - title: Accounts & keys
    details: ADM passphrase hashing, keypair and address derivation.
    link: /guide/adm-key-pairs
    linkText: ADM key pairs
  - title: Encrypted messaging
    details: Message and KVS encryption and decryption with NaCl box / secretbox.
    link: /guide/encryption
    linkText: Encryption
  - title: Transactions
    details: Construction, hashing, signing, and deterministic ID calculation.
    link: /guide/transactions
    linkText: Transactions
  - title: WebSocket subscriptions
    details: Subscribe to incoming transactions over Socket.IO with reconnection handling.
    link: /guide/websocket
    linkText: WebSocket
  - title: External wallets
    details: Optional BTC, ETH, DASH, and DOGE key/address derivation and validation.
    link: /guide/external-coins
    linkText: External coins
  - title: Modular imports
    details: Subpath exports so ADM-only consumers never bundle coin-specific code.
    link: /guide/modular-imports
    linkText: Modular imports
---
