---
id: tutorial
title: Tutorial
---

The quickest way to get started is to clone our [nitro-tutorial](https://github.com/statechannels/nitro-tutorial) github repository, where you are provided with a test environment and a prepared test script covering the content below.

If you would prefer to start from scratch, follow the steps in the quick start and follow along below.

---

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

---

## Execute state transitions off chain

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

const outcome: Outcome = [];

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

Notice that the outcome field must conform to the `Outcome` type, which can also be imported from `@statechannels/nitro-protocol`. Don't worry about this field just yet, we will revisit it later (we got away with an empty array, for now).

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

### Conform to an on chain validTransition function

In ForceMove, every state has an associated 'mover' - the participant who had the unique ability to progress the channel at the point the state was created. The mover can be calculated from the `turnNum` and the `participants` as follows:

```solidity
moverAddress = participants[turnNum % participants.length]
```

The implication of this formula is that participants take turns to update the state of the channel. Furthermore, there are strict rules about whether a state update is valid, based on the previous state that has been announced. Beyond conforming to the state format, there are certain relationships that must hold between the state in question, and the previously announced state.

The full rule set is (pseudo-code):

```solidity
function validTransition(a, b) <=>
  b.turnNum == a.turnNum + 1
  b.chainId == a.chainId
  b.participants == a.participants
  b.appDefinition == a.appDefinition
  b.challengeDuration == a.challengeDuration
  a.signer == a.mover
  b.signer == b.mover
  if b.isFinal
     b.defaultOutcome == a.defaultOutcome
  else if b.turnNum < 2n
     a.isFinal == False
     b.defaultOutcome == a.defaultOutcome
     b.appData == a.appData
   else
     a.isFinal == False
     b.app.validTransition(a, b)
```

Note the use of `app.ValidTransition`. This function should be written by third party DApp developers. We provide a `TrivialApp` contract which always returns `true`, to aid in testing:

```typescript
const fromState: State = {
  channel,
  outcome: [],
  turnNum: 1,
  isFinal: false,
  challengeDuration: 0x0,
  appDefinition: TRIVIAL_APP_ADDRESS, // Assuming this contract has been deployed and its address is known
  appData: '0x0',
};
const toState: State = {...fromState, turnNum: 2};

expect(
  await NitroAdjudicator.validTransition(
    channel.participants.length,
    [fromState.isFinal, toState.isFinal],
    [getVariablePart(fromState), getVariablePart(toState)],
    toState.turnNum,
    fromState.appDefinition
  )
).toBe(true);
```

### Support a state in several different ways

---

## Finalize a channel (happy)

### Conclude a channel using isFinal property

### Get your money out using conclude

---

## Finalize a channel (sad)

### Call forceMove

### Call checkpoint

### Call respond

---

## Get your money out

### Form allocation outcomes

### Form guarantee outcomes

### Using pushOutcome, and transferAll
