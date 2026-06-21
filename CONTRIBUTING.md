# Contributing to ADAMANT JavaScript API

Thank you for improving `adamant-api`. Changes should protect cryptographic correctness, node reliability, public API compatibility, and contributor clarity.

## Before you start

- Search [existing issues](https://github.com/Adamant-im/adamant-api-jsclient/issues) before opening a new one.
- Use a concise issue prefix such as `[Bug]`, `[Feat]`, `[Refactor]`, `[Docs]`, `[Test]`, or `[Chore]`.
- Base work on `dev` and target `dev` in pull requests. `master` represents stable releases.
- Keep changes focused. Protocol, transaction-byte, signing, hashing, and encryption changes require explicit coordinated work.
- Never commit or log passphrases, mnemonic seeds, private keys, decrypted payloads, or sensitive tokens.

All repository artifacts—including code, comments, documentation, commits, issues, and pull requests—must be written in English.

## Development setup

Use Node.js 22 or newer and the pnpm version declared in `package.json`:

```sh
git clone https://github.com/Adamant-im/adamant-api-jsclient.git
cd adamant-api-jsclient
git switch dev
corepack enable
pnpm install
```

Create a dedicated branch and keep commits compatible with Conventional Commits:

```sh
git switch -c feat/short-description
```

## Validation

Pull requests must include tests for new features and bug fixes. Tests are collocated with the code in `tests` directories. Choose the smallest focused test while developing, then run the complete baseline before submitting:

```sh
pnpm build
pnpm test
pnpm lint
```

Also run these checks when relevant:

```sh
pnpm metadata:check  # wallet metadata or coin changes
pnpm test:package    # package exports or declaration changes
pnpm audit           # dependency changes
pnpm fix             # apply project formatting and safe lint fixes
```

Report the exact commands run and any skipped or blocked validation in the pull request. Changes to key derivation, encryption, or transactions must preserve the established test vectors.

## Project structure

- `src/adm/`: explicit ADM-only public surface
- `src/api/`: `AdamantApi`, request helpers, and generated DTOs
- `src/helpers/`: keys, encryption, transactions, health checks, sockets, and shared utilities
- `src/coins/`: optional BTC, ETH, DASH, and DOGE implementations
- `src/metadata/`: generated wallet metadata and its typed public API
- `scripts/`: repository maintenance and deterministic generation tools
- `examples/`: small usage examples

Keep optional coin dependencies behind `adamant-api/coins/*` entry points. The package root and `adamant-api/adm` must not import coin implementations.

## Generated API types

Do not hand-edit `src/api/generated.ts` for routine schema updates. It is generated from the pinned [`adamant-schema`](https://github.com/Adamant-im/adamant-schema) revision in `scripts/sync-api-types.mjs`.

```sh
pnpm api-types:check
pnpm api-types:sync
```

To update the DTOs, review and change the pinned commit in the script, run `pnpm api-types:sync`, inspect the generated diff, and run the full validation suite. The generated file records both the schema revision and generator version.

## Wallet metadata

`src/metadata/wallets.json` is generated from the pinned [`adamant-wallets`](https://github.com/Adamant-im/adamant-wallets) revision in `scripts/sync-wallet-metadata.mjs`.

To update it:

1. Review the intended upstream revision and change the pinned commit in the script.
2. Run `pnpm metadata:sync`.
3. Review the generated diff and confirm it is limited to intended metadata.
4. Run `pnpm metadata:check`, `pnpm build`, `pnpm test`, and `pnpm lint`.

Address regexes, decimals, symbols, explorer links, and wallet-facing blockchain definitions should remain aligned with `adamant-wallets`.

## Pull requests

- Use a title in `Type: Short summary` form, for example `Refactor: Add modular coin entry points`.
- Link related issues explicitly.
- Explain public API or import-path changes and include migration examples.
- Update documentation when behavior, exports, setup, or workflows change.
- Keep dependency additions minimal and explain cryptography or networking dependencies.
- Ensure hooks, compile, tests, lint, and relevant generated-file checks pass.

Small reviewable commits are welcome; maintainers may squash them when merging.
