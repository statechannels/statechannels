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
  <a href="https://circleci.com/gh/statechannels/monorepo"><img src="https://circleci.com/gh/statechannels/monorepo.svg?style=shield&circle-token=adc9e1576b770585a350141b2a90fc3d68bc048c" alt="circleci"></a>
  <a href="https://lernajs.io/"><img src="https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg"/></a>
  <a href="https://statechannels.com/chat"><img src="https://img.shields.io/discord/500370633901735947.svg"/></a>
  <a href="https://github.com/renovatebot/renovate"><img src="https://badges.renovateapi.com/github/statechannels/monorepo"/></a>
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
  - [Patches](#patches)

## Packages

This repository is a monorepo, and contains the following packages maintained with [lerna](https://github.com/lerna/lerna) and [yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/):

- [channel-provider](.packages/channel-provider) : a browser-based loader for the Embedded Wallet.
- [devtools](./packages/devtools) : developer tooling
- [embedded-wallet](./packages/embedded-wallet): allows DApps to integrate with statechannels system
- [engine](./packages/engine) : core wallet logic that follows ForceMove and Nitro protocols
- [hub](./packages/hub) : server wallet for mediating virtual channels
- [jest-gas-reporter](./packages/jest-gas-reporter) : reports the gas used by various calls to ethereum contracts
- [nitro-protocol](./packages/nitro-protocol) : smart contracts and documentation website
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

### Patches

We generate patches using the [`patch-package`](https://github.com/ds300/patch-package) tool with a workaround described in [this issue](https://github.com/ds300/patch-package/issues/42#issuecomment-435992316) for `yarn` workspaces.

[statechannels-discord-url]: https://statechannels.com/chat
