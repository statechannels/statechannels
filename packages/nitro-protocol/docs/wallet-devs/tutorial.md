---
id: tutorial
title: Tutorial
---

The quickest way to get started is to clone our [nitro-tutorial](https://github.com/statechannels/nitro-tutorial) github repository, where you are provided with a test environment and a prepared test script covering the content below.

If you would prefer to start from scratch, follow the steps in the quick start and follow along below.

## Deposit assets

### Compute a channel id

The id of a channel is the `keccak256` hash of the abi encoded `chainId`, `participants` and `channelNonce`.

By choosing a new `channelNonce` each time the same participants execute a state channel supported by the same chain, they can avoid replay attacks. The `getChannelId` helper exported by `@statechannels/nitro-protocol` accepts an object of type `Channel` (which contains all the necessary properties) and computes the channel id for you.

```typescript
// Import Ethereum utilities
import {Wallet} from 'ethers';

// Import statechannels utilities
import {Channel, getChannelId} from '@statechannels/nitro-protocol';

const participants = [];
for (let i = 0; i < 3; i++) {
  // As many participants as you like
  participants[i] = Wallet.createRandom().address;
}

const chainId = '0x1234'; // E.g. '0x1' for mainnnet. Using a mock here

const channelNonce = bigNumberify(0).toHexString();
const channel: Channel = {chainId, channelNonce, participants};
const channelId = getChannelId(channel);
```

### Deposit into the ETH asset holder

The deposit method allows ETH to be escrowed against a channel.

Call signature:

```solidity
function deposit(bytes32 destination, uint256 expectedHeld, uint256 amount) public payable
```

Checks:

- `destination` must NOT be an [external destination](#destinations).
- The holdings for `destination` must be greater than or equal to `expectedHeld`.
- The holdings for `destination` must be less than the sum of the amount expected to be held and the amount declared in the deposit.

```typescript
// Import Ethereum utilities
import {Contract, parseUnits} from 'ethers/utils';
let ETHAssetHolder: Contract; // This needs to point to a deployed contract

// Import statechannels utilities
import {randomChannelId} from '@statechannels/nitro-protocol';

const held = parseUnits('1', 'wei');
const channelId = randomChannelId();

const tx0 = ETHAssetHolder.deposit(channelId, 0, held, {
  value: held,
});
```

## Execute state transitions off chain

### Support a state in several different ways

### Construct a State with the correct format

A specified format of _state_ is vital, since it constitutes much of the interface between the on- and off- chain behavior of the state channel network. `@statechannels/nitro-protocol` exposes a `State` type as a container for all the fields that are required:

```typescript
const participants = [];
for (let i = 0; i < 3; i++) {
  participants[i] = Wallet.createRandom().address;
}
const chainId = '0x1234';
const channelNonce = bigNumberify(0).toHexString();
const channel: Channel = {chainId, channelNonce, participants};

const outcome: Outcome = [
  {
    allocationItems: [],
    assetHolderAddress: Wallet.createRandom().address,
  },
];

const state: State = {
  turnNum: 0,
  isFinal: false,
  channel,
  challengeDuration: 1,
  outcome,
  appDefinition: '0x0',
  appData: '0x0',
};
```

Notice that the outcome field must conform to the `Outcome` type, which can also be imported from `@statechannels/nitro-protocol`. Don't worry about this field just yet, we will revisit it later.

#### Fixed and Variable Parts

It is convenient to define some other structs, each containing a subset of the above data:

```solidity
  struct FixedPart {
        uint256 chainId;
        address[] participants;
        uint256 channelNonce;
        address appDefinition;
        uint256 challengeDuration;
    }
```

which contains information which must be identical in every state channel update, and

```solidity
   struct VariablePart {
        bytes outcome;
        bytes appData;
    }
```

which contains fields which are allowed to change. These structs are part of the contract API, and we can import helper functions to extract a javascript encoding of them:

```typescript
import {getFixedPart, getVariablePart} from '@statechannels/nitro-protocol';

const fixedPart = getFixedPart(state);
const getVariablePaert = getVariablePart(state);
```

These structs, along with remaining fields, `turnNum` and `isFinal`, can be passed in to contract methods for more gas efficient execution.

### Conform to an on chain validTransition function

## Finalize a channel (happy)

### Conclude a channel using isFinal property

### Get your money out using conclude

## Finalize a channel (sad)

### Call forceMove

### Call checkpoint

### Call respond

## Get your money out

### Form allocation outcomes

### Form guarantee outcomes

### Using pushOutcome, and transferAll
