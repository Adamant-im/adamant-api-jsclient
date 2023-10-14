# Contributing Guide

Before submitting your contribution, please make sure to take a moment and read through the following guidelines:

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Setup](#development-setup)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Contributing Tests](#contributing-tests)

## Issue Reporting Guidelines

- Always use [GitHub Issues](https://github.com/Adamant-im/adamant-api-jsclient/issues) to create new issues.

## Pull Request Guidelines

- The master branch is just a snapshot of the latest stable release. All development should be done in dedicated branches. Do not submit PRs against the master branch.

- Checkout a topic branch from a base branch, e.g. `dev`, and merge back against that branch.

- If adding a new feature add accompanying test case.

- It's OK to have multiple small commits as you work on the PR - GitHub can automatically squash them before merging.

- Make sure tests pass!

- Commit messages must follow the [commit message convention](https://github.com/angular/angular/blob/68a6a07/CONTRIBUTING.md#commit). Commit messages are automatically validated before commit (by invoking [Git Hooks](https://git-scm.com/docs/githooks) via [husky](https://github.com/typicode/husky)).

- No need to worry about code style as long as you have installed the dev dependencies - modified files are automatically formatted with Prettier on commit (by invoking [Git Hooks](https://git-scm.com/docs/githooks) via [husky](https://github.com/typicode/husky)).

## Development Setup

You will need [Node.js](https://nodejs.org) **version 16+** and [pnpm](https://pnpm.io/).

After cloning the repo, run:

```bash
$ pnpm i # install the dependencies of the project
```

A high level overview of tools used:

- [Jest](https://jestjs.io) for unit testing
- [gts](https://github.com/google/gts) for code formatting

## Scripts

### `npm run lint`

The `lint` script runs linter.

```bash
# lint files
$ npm run lint
# fix linter errors
$ npm run fix
```

### `npm run test`

The `test` script simply calls the `jest` binary, so all [Jest CLI Options](https://jestjs.io/docs/en/cli) can be used. Some examples:

```bash
# run all tests
$ npm run test

# run all tests under the runtime-core package
$ npm run test -- runtime-core

# run tests in a specific file
$ npm run test -- fileName

# run a specific test in a specific file
$ npm run test -- fileName -t 'test name'
```

### Generating API types

To generate API types, run the following commands in the [`adamant-schema`](https://github.com/Adamant-im/adamant-schema/)'s master branch with the latest commit:

```bash
# build OpenAPI schema
$ npm run bundle
# generate typescript from the schema
$ npx swagger-typescript-api -p ./dist/schema.json -o ./dist -n generated.ts --no-client
```

Then, copy `dist/generated.ts` to `adamant-api-jsclient` at `src/api/generated.ts`.

## Project Structure

- **`src`**: contains the source code

  - **`api`**: contains group of methods and methods for the API.

    - **`genearated.ts`**: contains auto-generated types for API.

  - **`coins`**: contains group of utils for coins.

  - **`helpers`**: contains utilities shared across the entire codebase.

    - **`tests`**: contains tests for the helpers directory.

## Contributing Tests

Unit tests are collocated with the code being tested inside directories named `tests`. Consult the [Jest docs](https://jestjs.io/docs/en/using-matchers) and existing test cases for how to write new test specs. Here are some additional guidelines:
