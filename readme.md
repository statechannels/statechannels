<h1 align="center">
  <br>
  <a href="https://statechannels.org"><img src="./logo.svg" alt="State Channels" width="350"></a>
</h1>

<h4 align="center">Simple off-chain applications framework for Ethereum.</h4>

<p align="center">
  <a href="https://circleci.com/gh/statechannels/monorepo"><img src="https://circleci.com/gh/statechannels/monorepo.svg?style=shield" alt="circleci"></a>
  <a href="https://lernajs.io/"><img src="https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg"/></a>
  <a href="https://research.statechannels.org/"><img src="https://img.shields.io/badge/Forums-Chat-blue"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
</p>
<br>

**statechannels** is a simple off-chain framework for building **state channel applications** on top of the Ethereum blockchain. It aims to make it simpler to build permissionless applications that have instant finality with zero-fee transactions.

You can learn more about what state channels are by reading [one](https://l4.ventures/papers/statechannels.pdf) or [other](https://magmo.com/force-move-games.pdf) of the whitepapers underpinning the project, or a less technical written [description](https://medium.com/blockchannel/state-channel-for-dummies-part-2-2ffef52220eb).

- [Packages](#packages)
- [Contributing](#contributing)
  - [Installing dependencies](#installing-dependencies)
  - [Building packages](#building-packages)
  - [Clean](#clean)
  - [Lint](#lint)
  - [Tests](#tests)
- [Community](#community)

## Packages

This repository is a monorepo, and contains the following packages maintained with [lerna](https://github.com/lerna/lerna) and [yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/):

- [benchmarking](./packages/benchmarking) : Small application that generates time-taken data for our libraries and applications
- [client-api-docs](./packages/client-api-docs) : API docs for the interface betwen a state channel Dapp and the wallet
- [channel-client](./packages/channel-client) : A JavaScript object interface for the state channels client API
- [docs-websitel](./packages/docs-website/website) : Documentation website
- [iframe-channel-provider](./packages/iframe-channel-provider) : Thin wrapper around PostMessage communication between an App and a Wallet
- [client-api-schema](./packages/client-api-schema) : JSON-RPC based schema definitions for the Client API with TypeScript typings
- [devtools](./packages/devtools) : Developer tooling
- [jest-gas-reporter](./packages/jest-gas-reporter) : Reports the gas used by various calls to ethereum contracts
- [nitro-protocol](./packages/nitro-protocol) : Smart contracts and typescript support
- [wallet-core](./packages/wallet-core) : Core wallet code that works in node-js and browser contexts
- [wire-format](./packages/wire-format) : Format of messages that are sent over the wire between wallets
- [xstate-wallet](./packages/xstate-wallet) : A browser wallet implementation

## Contributing

- **[Create a new issue](https://github.com/statechannels/monorepo/issues/new)** to report bugs
- **[Fix an issue](https://github.com/statechannels/statechannels/issues?state=open)**. statechannels is an [Open Source Project](.github/CONTRIBUTING.md)!

### Installing dependencies

**Make sure you have Yarn v1.17.3 installed**. For easy management of specific Yarn versions, we recommend using [Yarn Version Manager (YVM)](https://github.com/tophat/yvm).

To install the dependencies:

```shell
yarn
```

from the monorepo root.

### Building packages

To build all packages:

```shell
yarn build
```

### Clean

To clean all packages:

```shell
yarn clean
```

### Lint

To lint all packages:

```shell
yarn lint:check
```

To also apply automatic fixes:

```shell
yarn lint:write
```

### Tests

To run all tests:

```shell
yarn test
```

## Community

State Channels Forums: https://research.statechannels.org/
