# ADAMANT JS API: AI Agent Operating Manual

This document defines how AI agents should work in this repository.

## Mission

`adamant-api-jsclient` is a TypeScript/Node.js API library for the ADAMANT blockchain.

Agent output must optimize for:

1. Security and cryptographic correctness
2. Reliability of node access, retries, and failover
3. Backward compatibility of the public API and transaction behavior
4. Open-source maintainability and contributor clarity

If tradeoffs are required, preserve secret safety, signing correctness, and network compatibility first.

## Architecture Direction

- Evolve this repository toward a unified, modular JavaScript SDK for the ADAMANT blockchain and ADM-derived external cryptocurrency wallets
- Keep the current external coin scope focused on authoritative metadata from `adamant-wallets`, deterministic key and address derivation, and address validation; external-chain balances, transaction history, signing, and broadcasting require separate explicit tasks
- Keep coin-specific dependencies inside `adamant-api` for now, but isolate coin implementations behind subpath exports and do not import them from the root entry point so ADM-only consumers do not load or bundle Bitcoin, Ethereum, or other coin code
- Preserve the existing root API while introducing stable module boundaries and subpath exports; splitting coin implementations into separately installed packages is not part of the current architecture task
- Leave room for future agent-oriented workflows and a signer abstraction without implementing or exposing those APIs prematurely; current architectural changes should avoid choices that would require breaking the SDK to add them later
- Treat `@adamant/sdk` as a prospective package identity, not an alias or approved rename. The repository remains `adamant-api-jsclient`, and package naming changes require a separate compatibility and migration plan
- `adamant-wallets-js` is archived and is not an implementation source; retain its history only as prior research

See [Refactor] Evolve adamant-api-jsclient into a modular ADM and coin SDK <https://github.com/Adamant-im/adamant-api-jsclient/issues/77> for details.

## Language Policy

- Developers may communicate with AI in any language
- All repository artifacts must be in English only
- Write code, comments, docs, commit messages, issue text, and PR text in English

## Sources of Truth

Use these sources when implementing or reviewing changes:

- This repository: `README.md`, `package.json`, `CONTRIBUTING.md`, current code, and passing tests
- ADAMANT docs: <https://docs.adamant.im>
- ADAMANT schema source for generated API types: <https://github.com/Adamant-im/adamant-schema>
- Related wallet metadata and OpenAPI spec: <https://github.com/Adamant-im/adamant-wallets> and <https://github.com/Adamant-im/adamant-wallets/blob/dev/specification/openapi.json>
- Org-wide issue and label governance: <https://github.com/Adamant-im/.github>

Important repository-specific rule:

- If docs and code disagree, treat current code and passing tests as implementation truth and document the drift
- `adamant-wallets` is a related source for wallet-facing coin and token metadata, address regexes, node and service health-check settings, explorer links, and blockchain definitions; it is especially relevant when changing `src/coins/*`, external wallet integrations, or future wallet-oriented API contracts

## Issue, Label, and PR Conventions

When creating issues:

1. Search existing issues first: <https://github.com/Adamant-im/adamant-api-jsclient/issues>
2. Use a concise prefixed title
3. Apply labels from `Adamant-im/.github/labels.json`
4. Link related issues and PRs explicitly

Recommended issue title prefixes:

- `[Bug]`
- `[Feat]`
- `[Enhancement]`
- `[Refactor]`
- `[Docs]`
- `[Test]`
- `[Chore]`
- `[Task]`

Label policy:

- Use a small but informative set
- Prefer one type label and one or more domain labels such as `APIs`, `NodeJS`, `TypeScript`, `Security`, `Privacy`, or `Nodes`
- Keep label casing aligned with org rules

PR and branch policy:

- Target `dev`, not `master`
- Keep PR titles in `Type: Short summary` form such as `Docs: Add AGENTS.md`
- Do not use issue-style square-bracket prefixes in PR titles
- Keep commits compatible with Conventional Commits and current commitlint rules

## System Map

Key areas of this repository:

- `src/index.ts`: public exports
- `src/api/index.ts`: `AdamantApi` HTTP client, retries, request helpers, endpoint surface
- `src/api/generated.ts`: generated API DTO types copied from `adamant-schema`
- `src/helpers/healthCheck.ts`: node health checks, sync grouping, active-node selection, socket coordination
- `src/helpers/keys.ts`: passphrase hashing, ADM keypair derivation, ADM address creation
- `src/helpers/encryptor.ts`: message encryption and decryption
- `src/helpers/transactions/*`: transaction creation, hashing, signing, and IDs
- `src/helpers/wsClient.ts`: Socket.IO subscriptions for incoming transactions
- `src/coins/*.ts`: BTC, ETH, DASH, and DOGE wallet helpers

## Non-Negotiable Security Rules

- Never log passphrases, mnemonic seeds, private keys, decrypted payloads, or sensitive tokens
- Never weaken key derivation, encryption, signature generation, or transaction hashing behavior
- Never change transaction byte layout, IDs, or signature semantics without explicit coordinated protocol work
- Validate external inputs before using them in network requests, signing, or wallet generation
- Minimize new dependencies, especially cryptography and networking dependencies
- Do not hand-edit `src/api/generated.ts` for routine changes when regeneration from schema is the correct path

## Reliability and Decentralization Rules

- Do not hardcode a single node as the only viable path
- Preserve health-check behavior, retry logic, and active-node switching unless the task explicitly changes them
- Keep node selection compatible with height-based sync checks and socket support filtering
- Fail safely on malformed data, timeouts, and partial node outages
- Prefer clear returned errors and logs over silent failure

## Testing and Validation

For code changes, baseline validation is:

- `npm run compile`
- `npm test`
- `npm run lint`

Additional repository-specific expectations:

- Add or update tests near the changed behavior in collocated `tests` directories
- If you change generated API types, regenerate from `adamant-schema`, then run compile and tests
- For docs-only changes, say explicitly that runtime tests were not run

## Working Style

- Prefer focused patches over broad rewrites
- Match local file style unless there is a strong reason to change it
- Preserve public exports and backward-compatible behavior where possible
- Update docs when behavior or workflow changes
- When a CLI tool accepts multi-line input, prefer a temporary file in `.ai-ignored/`

## Done Criteria

A change is not complete until all of the following are true:

1. Security-sensitive behavior is preserved or intentionally documented
2. Relevant validation commands were run or an explicit blocker was reported
3. Documentation was updated when behavior or workflow changed
4. No secret exposure or single-point-of-failure regression was introduced
