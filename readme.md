<h1 align="center">
  <br>
  <a href="https://statechannels.org"><img src="./logo.png" alt="State Channels" width="150"></a>
  <br>
  State Channels
  <br>
  <br>
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
- [embedded-wallet](./packages/embedded-wallet): Allows DApps to integrate with statechannels system
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

The tests for the `rps`, `nitro-protocol`, `wallet` and `hub` packages need to interact with a local blockchain.

Run the following script _from the root of the repo_ to start a ganache server and create a common `NetworkContext` object that holds the relevant contract information for the various packages that need the corresponding contracts.

```shell
yarn start:ganache
```

The `NetworkContext` object is held at a specific path of the `nitro-protocol` package that can be referenced in other packages via `import NetworkContext from "@statechannels/nitro-protocol/ganache-ganache-network-context.json"`.

Running the above script should produce an output similar to this:

```shell
Writing network context into file: ~/monorepo/packages/nitro-protocol/ganache/ganache-network-context.json

HTTP server listening on port 3000
Starting ganache on port 8547 with network ID 9001
Deploying built contracts to chain at: http://localhost:8547
Contracts deployed to chain
Network context written to ganache-network-context.json
```

The configuration used for this chain can be updated via the `.env` file in the `nitro-protocol` package.

Once this server is shut down, it'll remove the `NetworkContext` object that was created for that instance of the ganache and it should display something similar to:

```shell
Deleted locally deployed network context: ganache-network-context.json
```

## Community

State Channels Forums: https://research.statechannels.org/
