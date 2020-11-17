<h1 align="center">
<div><img src="https://protocol.statechannels.org/img/favicon.ico"> </div>
Nitro Protocol
</h1>

Smart contracts that implement nitro protocol for state channel networks on ethereum. Includes javascript and typescript support.

There is an accompanying documentation [website](https://protocol.statechannels.org/).

A full description of nitro protocol and it's capabilities can be found in a [whitepaper](https://eprint.iacr.org/2019/219).

## Installation

```
.../my-statechannel-app> npm install --save @statechannels/nitro-protocol
```

## Getting started

### Building your state channel application contract against our interface:

```solidity
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';

contract MyStateChannelApp is ForceMoveApp {
  function validTransition(
    VariablePart memory a,
    VariablePart memory b,
    uint256 turnNumB,
    uint256 nParticipants
  ) public override pure returns (bool) {
    Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
    Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));

    /* The rest of your logic */

    return true;
  }
}
```

### Import precompiled artifacts for deployment/testing

```typescript
const {
  NitroAdjudicatorArtifact,
  EthAssetHolderArtifact,
  Erc20AssetHolderArtifact,
  TrivialAppArtifact,
  TokenArtifact,
} = require('@statechannels/nitro-protocol').ContractArtifacts;
```

### Import typescript types

```typescript
import {Channel} from '@statechannels/nitro-protocol';

const channel: Channel = {
  chainId: '0x1',
  channelNonce: 0,
  participants: ['0xalice...', '0xbob...'],
};
```

### Import javascript helper functions

```typescript
import {getChannelId} from '@statechannels/nitro-protocol';

const channelId = getChannelId(channel);
```

## Development (GitHub)

We use [etherlime](https://etherlime.gitbook.io/) for smart contract development.

To get started:

1. Download the repo, `cd` into the directory and run `yarn install`
2. Run `yarn install`.
3. Run `yarn test`.

## Documentation website (GitHub)

1. Run `yarn docgen` to auto-generate markdown files from compiled Solidity code (using our fork of [`solidoc`](https://github.com/statechannels/solidoc)). If you change the source code you will need to recompile the contracts and re-run `solidoc` using `yarn contract:compile && yarn docgen`.
2. Run `cd website`
3. Run `yarn install`
4. Run `yarn start`

See https://docusaurus.io/docs/en/installation for more information.

NB: you may run into difficulty running `docgen / solidoc` if you have the native solc compiler installed at the incorrect version number. You may refer to the circle `config.yml` at the monorepo root to check which version is being used as a part of our continuous integration.

To add a new version of the docs, follow the instructions at https://docusaurus.io/docs/en/tutorial-version. We try to keep the documentation version in sync with the @statechannels/nitro-protocol npm package.

## Deploying contracts to a testnet

The current [hardhat](https://www.npmjs.com/package/hardhat-deploy) config (`hardhat.config-rinkeby.ts`) works with Rinkeby testnet. It can be added on to for any other network.

```
INFURA_TOKEN=[your token here] RINKEBY_DEPLOYER_PK=[private key used for rinkeby deploy] yarn contract:deploy-rinkeby
```

The config extends from a minimal base config (`hardhat.config.ts`) that is used for other tasks such as compilation.
