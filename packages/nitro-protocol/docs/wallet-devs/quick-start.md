---
id: quick-start
title: Quick Start
---

The quickest way to get started is to clone our [nitro-tutorial](https://github.com/statechannels/nitro-tutorial) github repository, where we have created an small TypeScript package with the steps below already performed.

## Add precompiled contracts to your project

To get started with the nitro contracts, we recommend you install the @statechannels/nitro-protocol package using your favourite node package manager:

```console
> npm i @statechannels/nitro-protocol
```

You can import precompiled contract artifacts into your project like this:

```javascript
const {
  NitroAdjudicatorArtifact,
  EthAssetHolderArtifact,
} = require('@statechannels/nitro-protocol').ContractArtifacts;
```

## Deploy contract artifacts

We recommend that you deploy these artifacts to a local blockchain in order to connect and interact with them. Because asset holder contracts need to know the address of the adjudicator contract, your deployment code should look something like this:

```javascript
const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(NitroAdjudicatorArtifact);

const TEST_ETH_ASSET_HOLDER_ADDRESS = await deployer.deploy(
  EthAssetHolderArtifact,
  {},
  NITRO_ADJUDICATOR_ADDRESS
);
```
