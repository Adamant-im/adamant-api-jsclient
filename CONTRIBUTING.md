# Contributing Guide

Before submitting your contribution, please make sure to take a moment and read through the following guidelines:

- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Setup](#development-setup)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Contributing Tests](#contributing-tests)

## Pull Request Guidelines

- Checkout a topic branch from a base branch, e.g. `master`, and merge back against that branch.

- If adding a new feature add accompanying test case.

- It's OK to have multiple small commits as you work on the PR - GitHub can automatically squash them before merging.

- Make sure tests pass!

- Commit messages must follow the [commit message convention](./commit-convention.md). Commit messages are automatically validated before commit (by invoking [Git Hooks](https://git-scm.com/docs/githooks) via [husky](https://github.com/typicode/husky)).

- No need to worry about code style as long as you have installed the dev dependencies - modified files are automatically formatted with Prettier on commit (by invoking [Git Hooks](https://git-scm.com/docs/githooks) via [husky](https://github.com/typicode/husky))..

## Development Setup

You will need [Node.js](https://nodejs.org) **version 16+**.

After cloning the repo, run:

```bash
$ npm i # install the dependencies of the project
```

A high level overview of tools used:

- [Jest](https://jestjs.io/) for unit testing
- [Prettier](https://prettier.io/) for code formatting

## Scripts

### `npm run lint`

The `lint` script runs linter.

```bash
# lint files
$ npm run lint
# fix linter errors
$ npm run lint:fix
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

## Project Structure

- **`src`**: contains the source code

  - **`api`**: contains group of methods and methods for the API.

  - **`helpers`**: contains utilities shared across the entire codebase.

    - **`tests`**: contains tests for the helpers directory.

  - **`tests`**: contains tests for the src directory.

## Contributing Tests

Unit tests are collocated with the code being tested inside directories named `tests`. Consult the [Jest docs](https://jestjs.io/docs/en/using-matchers) and existing test cases for how to write new test specs. Here are some additional guidelines:

- Use the minimal API needed for a test case. For example, if a test can be written without involving the reactivity system or a component, it should be written so. This limits the test's exposure to changes in unrelated parts and makes it more stable.

- Only use platform-specific runtimes if the test is asserting platform-specific behavior.
