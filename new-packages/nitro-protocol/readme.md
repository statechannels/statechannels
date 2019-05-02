<h1 align="center">
<div><img src="./orange_fireball.svg"> </div>
Magmo Protocols
</h1>
Welcome to the Magmo protocol mono-repo, home of the smart contracts that implement our state channel protocols. Various utilities are also found here.

On our [website](https://magmo.com) you will find links to our whitepapers and contact information.

This repository contains (i) a state channel framework capable of running 3rd-party
'applications' that conform to a simple state-machine interface and (ii) an extension to allow for large-scale state-channel networks.

# ForceMove and the simple-adjudicator

The ForceMove framework takes a pragmatic approach to state channels directly funded by on-chain deposits: sacrificing generality of the supported applications,
for simplicity in the on-chain and off-chain logic. In particular, the framework can't (yet) support
any applications that have state transitions whose validity depends on time, or other properties
that are external to the channel's state. For example, as it currently stands, you couldn't build
a state channel sports betting game, where bets have to be made by a deadline and the winner
is determined through an oracle feed.

A full description of the framework and it's capabilities can be found in our [whitepaper](https://magmo.com/force-move-games.pdf).

The framework separates the core behaviour of the protocol from the implementation. We currently
provide one implementation (the simple adjudicator). You can find more about working with the
framework using the simple adjudicator in the [readme](./packages/fmg-simple-adjudicator).

The simple-adjudicator contract in this respository currently supports a single 2-player game, but that's mostly
due to solidity challenges and time constraints - the framework itself extends naturally to
n-player games.

This repository contains the logic
for a few example applications (a [payment channel](./packages/fmg-payments) and the game of
[rock-paper-scissors](./packages/fmg-rock-paper-scissors)) to demonstrate how to build on top
of the framework. You may also find more advanced, fully-functioning example applications in our [Apps monorepo](https://github.com/magmo/apps), including Tic Tac Toe and our Channel Wallet.

# Nitro and the nitro-adjudicator

Nitro protocol subsumes and extends ForceMove by allowing for ledger channels (which can allocate funds to other state channels) and virtual channels (which allow intermediaries to help other state-channel-network users open and close channels off-chain).

A full description of the framework and it's capabilities can be found in our second [whitepaper](https://eprint.iacr.org/2019/219).

The nitro-adjudicator supports an arbitrary number of state channels, and introduces new on-chain functions to manage state channel networks. We are currently working on an upgrading our example applications to run in ledger and virtual channels, as well as upgrading our channel wallet to help manage multiple channels in the network.

# Packages

This repository is split into packages, the first two of which are published as independent node modules.

| Package                                                         | Description                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`fmg-core`](/packages/fmg-core)                                | Contracts and js libraries for the protocols' rules and states                      |
| [`fmg-simple-adjudicator`](./packages/fmg-simple-adjudicator)   | Implementation of on-chain adjudicator capable of supporting the ForceMove protocol |
| [`fmg-nitro-adjudicator`](./packages/fmg-nitro-adjudicator)     | Implementation of on-chain adjudicator capable of supporting the Nitro protocol     |
| [`fmg-rock-paper-scissors`](./packages/fmg-rock-paper-scissors) | Example: 2-player game built on the framework                                       |
| [`fmg-payments`](./packages/fmg-payments)                       | Example: payment channel built on the framework                                     |

### TODO

This project is still a work in progress! Still to do in the short term:

- [x] Publish packages to npm.
- [x] Release [whitepaper](https://magmo.com/force-move-games.pdf)
- [x] Build out full example applications (including UI) [RPS and TTT](https://github.com/magmo/apps).
- [ ] Optimize contracts for gas consumption.
- [ ] More tests to demonstrate the simple adjudicator.
- [ ] Audit contracts.

In the medium term:

- [ ] Add support for ERC20 tokens.
- [ ] Extend the code to n-party games.
- [x] Create [nitro-adjudicator](./packages/fmg-nitro-adjudicator): capable of supporting [ledger channels and virtual channels](https://eprint.iacr.org/2019/219).

:rotating_light: **WARNING: This code is not production ready.** :rotating_light:

### Contributing

We welcome contributions and feedback from the community! We'll be putting together some more-comprehensive
contributing guidelines shortly. In the meantime, [issues](https://github.com/magmo/force-move-games/issues)
and PRs welcome!

### Development

We use [lerna](https://lernajs.io/) to manage the packages inside the repository and
[truffle](http://truffleframework.com/) for smart contract development.

To get started:

1. Download the repo.
2. Install lerna: `npm install -g lerna`.
3. Install truffle: `npm install -g truffle`.
4. Install [ganache](http://truffleframework.com/ganache/).
5. Run `lerna bootstrap` anywhere in the project.
6. Within a package, run `npm test` for that package's tests. Or, run it from the project root to test both `fmg-core` and `fmg-simple-adjudicator`.

NOTE: while the above instructions use globally installed `lerna` and `truffle` node modules, the tests running on circleci use dev dependencies, and may therefore produce different results.

### License

This project is licensed under the terms of the MIT license.
