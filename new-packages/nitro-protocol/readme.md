# Force-move Games

This repository contains a small state channel framework capable of running 3rd-party 
'applications' that conform to a simple state-machine interface. It also contains the logic 
for a few example applications (a [payment channel](./packages/fmg-payments) and the game of 
[rock-paper-scissors](./packages/fmg-rock-paper-scissors)) to demonstrate how to build on top
of the framework.

The framework takes a pragmatic approach, sacrificing generality of the supported applications,
for simplicity in the on-chain and off-chain logic. In particular, the framework can't (yet) support
any applications that have state transitions whose validity depends on time, or other properties
that are external to the channel's state. For example, as it currently stands, you couldn't build
a state channel sports betting game, where bets have to be made by a deadline and the winner
is determined through an oracle feed.

A full description of the framework and it's capabilities can be found in our whitepaper (coming soon!).

The framework in this respository is currently limited to 2-player games, but that's mostly
due to solidity challenges and time constraints - the framework itself extends naturally to
n-player games.

### Usage

The framework separates the core behaviour of the protocol from the implementation. We currently
provide one implementation (the simple adjudicator). You can find more about working with the
framework using the simple adjudicator in the [readme](./packages/fmg-simple-adjudicator).

### Packages

This repository is split into packages which ~are~ will be published as independent node modules.
                                                           
| Package                       |  Description                                  |
| ----------------------------- |  -------------------------------------------- |
| [`fmg-core`](/packages/fmg-core) | Contracts and js libraries for the protocol rules and states |
| [`fmg-simple-adjudicator`](./packages/fmg-simple-adjudicator) | Implementation of on-chain adjudicator capable of supporting the protocol |
| [`fmg-rock-paper-scissors`](./packages/fmg-rock-paper-scissors) | Example: 2-player game built on the framework |
| [`fmg-payments`](./packages/fmg-payments) | Example: payment channel built on the framework |

### TODO

This project is still a work in progress! Still to do in the sort term:

- [x] Publish packages to npm
- [ ] Release whitepaper
- [ ] Build out a full example application (including UI)
- [ ] Optimize contracts for gas consumption
- [ ] More tests to demonstrate the simple adjudicator
- [ ] Audit contracts

In the medium term:

- [ ] Add support for ERC20 tokens
- [ ] Extend the code to n-party games
- [ ] Create an adjudicator capable of supporting ledger channels and virtual channels

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
6. Within a package run `truffe test`.

### License

This project is licensed under the terms of the MIT license.
