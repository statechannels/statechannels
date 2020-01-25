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

- [channel-provider](.packages/channel-provider) : A browser-based loader for the Embedded Wallet.
- [devtools](./packages/devtools) : Developer tooling
- [embedded-wallet](./packages/embedded-wallet) : Allows DApps to integrate with statechannels system
- [ganache-deployer](./packages/ganache-deployer) : Manages cross-package contract deployment and a consistent network context
- [hub](./packages/hub) : Server wallet for mediating virtual channels
- [jest-gas-reporter](./packages/jest-gas-reporter) : Reports the gas used by various calls to ethereum contracts
- [nitro-protocol](./packages/nitro-protocol) : Smart contracts and documentation website
- [app-wallet-interface](./packages/app-wallet-interface) : API docs for the interface betwen a state channel Dapp and the wallet
- [rps](./packages/rps) : Rock paper scissors DApp
- [wallet](./packages/wallet) : Core wallet logic that follows ForceMove and Nitro protocols
- [web3torrent](./packages/web3torrent) : DApp extension of webtorrent including micropayments

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
yarn lint:fix
```

### Tests

To run all tests:

```shell
yarn test
```

### Development Flow

The `rps`, `nitro-protocol`, `wallet`, and `hub` packages will need to interact with a local
blockchain when running and testing locally.

#### Running locally

When running locally, it's often important to have the packages pointing to the same contracts
on the same local blockchain.

When started via `yarn start` the `rps`, `wallet`, and `hub` packages will:

1. Check for a "shared ganache" instance running at the `SHARED_GANACHE_PORT`, as defined
   in their `.env` file. (This is currently set the same for all packages.) This shared
   ganache instance can be started by running `yarn start:shared-ganache` from any of the
   packages.
2. If the shared ganache instance is found, they will deploy contracts to this instance, and
   make the addresses available in the application via `process.ENV`. Details of the deployed
   contract will also be stored in the `monorepo/ganache-deployments.json` file, so that
   if another project attempts to deploy another contract with the same args and bytecode,
   the address of the existing contract will be returned instead.
3. If no shared ganache instance is found, the package will start their own ganache instance,
   which won't be shared with any other package.

TL;DR: to share deployed contracts between packages in development, you **must start a shared
ganache server** with `yarn start:shared-ganache`.

## Community

State Channels Forums: https://research.statechannels.org/
