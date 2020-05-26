---
id: quick-start
title: Quick Start
---

The quickest way to get started is to clone our [nitro-tutorial](https://github.com/statechannels/nitro-tutorial) github repository, where we have created an small TypeScript package with the steps below already performed.

### To add precompiled contracts to your project

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

We recommend that you deploy these artifacts to a local blockchain in order to connect and interact with them.
