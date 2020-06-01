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

### `deposit` into the ETH asset holder

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

### Destinations

A `Destination` is a `bytes32` and either:

1. A `ChannelId` (see the section on [channelId](./force-move#channelid)), or
2. An `ExternalDestination`, which is an ethereum address left-padded with zeros.

:::tip
In JavaScript, the `ExternalDestination` corresponding to `address` may be computed as

```
'0x' + address.padStart(64, '0')
```

or

```
ethers.utils.hexZeroPad(address, 32);
```

:::

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

### Conform to an on chain `validTransition` function

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

Although you can check the validity of a state transition by providing the data above to an on-chain method, to cause any meaningful change in on-chain state (such as releasing funds), digitial signatures on those states are also required.

Nitro protocol uses the idea of supporting a state: in order for the chain to accept a channel state, `s`, that channel state must be _supported_ by `n` signatures (where `n = participants.length`). The simplest way for this to accomplish this is to provide a sequence of `n` states terminating is state `s`, where each state is signed by its mover and each consecutive pair of states form a valid transition.

There is also an optimization where a state can be supported by `n` signatures on a sequence of `m < n` states, provided again that each consecutive pair of those `m` states form a valid transition and further provided each participant has provided a signature on a state later or equal in the sequence than the state for which they were the mover.

In the extreme, this allows a single state signed by all `n` parties to be accepted by the chain.

In the following diagram, A is participant 0, B is participant 1 and C is participant 2. The states are shown by circles and numbered 0, 1, and 2. We are considering whether state with `turnNum = 2` is supported by various sets of signatures on the states in the sequence.

The yellow boxes show who signed what: in this case everyone signed their own state: this _is_ acceptable:

<div class="mermaid" align="center">
graph LR;
subgraph A
zero((0))
end
subgraph B
one((1))
end
subgraph C
two((2))
end
    zero-->one;
    one-->two;
</div>
 
Alternatively, A could sign a later state in the sequence:

<div class="mermaid" align="center">
graph LR;
subgraph " "
zero((0))
end
subgraph "A, B"
one((1))
end
subgraph C
two((2))
end
zero-->one;
one-->two;

</div>

or A, B and C could all sign the final state in the sequence:

<div class="mermaid" align="center">
graph LR;
subgraph " "
zero((0))
end
subgraph "  "
one((1))
end
subgraph "A, B, C"
two((2))
end
zero-->one;
one-->two;
</div>

(Note that there is no need to submit states to the chain if they are not signed by anybody).

The following signatures would not be acceptable:

<div class="mermaid" align="center">
graph LR;
subgraph " "
zero((0))
end
subgraph "B, C"
one((1))
end
subgraph A
two((2))
end
    zero-->one;
    one-->two;
</div>

We provide a helper function to sign a `State`:

```typescript
import {signState} from '@statechannels/nitro-protocol';

const wallet = Wallet.createRandom();
const state: State = {
  channel: {chainId: '0x1', channelNonce: '0x1', participants: [wallet.address]},
  outcome: [],
  turnNum: 1,
  isFinal: false,
  appData: '0x0',
  appDefinition: AddressZero,
  challengeDuration: 0x5,
};

const signedState: SignedState = signState(state, wallet.privateKey);
```

it returns an object of the `SignedState` type:

```typescript
import {Signature} from 'ethers/utils';
export interface SignedState {
  state: State;
  signature: Signature;
}
```

which we can make use of in the rest of the tutorial. Alternatively you may use `signStates(states, wallets, whoSignedWhat)`,
which accepts an array of `States`, an array of ethers.js `Wallets` and a `whoSignedWhat` array of integers. The implicit definition of this last argument is as follows: For each participant, we are asserting that `participant[i]` signed `states[whoSignedWhat[i]]`.

## Finalize a channel (happy)

If a participant signs a state with `isFinal = true`, then in a cooperative channel-closing procedure the other players can support that state. Once a full set of `n` such signatures exists \(this set is known as a **finalization proof**\) anyone in possession may use it to finalize the outcome on-chain. They would do this by calling `conclude` on the adjudicator.

### Call `conclude`

The conclude method allows anyone with sufficient off-chain state to immediately finalize an outcome for a channel without having to wait for a challenge to expire (more on that later).

The off-chain state(s) is submitted (in an optimized format), and once relevant checks have passed, an expired challenge is stored against the `channelId`. In this example the participants support the state by countersigning it, without increasing the turn number:

```typescript
import {hashAppPart, hashOutcome} = '@statechannels/nitro-protocol';

const whoSignedWhat = [0, 0, 0];
const largestTurnNum = 4;
const state: State = {
  isFinal: true,
  channel,
  outcome: [],
  appDefinition: AddressZero,
  appData: HashZero,
  challengeDuration: 1,
  turnNum: largestTurnNum,
};

const numStates = 1;
const fixedPart = getFixedPart(state);
const appPartHash = hashAppPart(state);
const outcomeHash = hashOutcome(state.outcome);
const sigs = await signStates([state], wallets, whoSignedWhat);

const tx = NitroAdjudicator.conclude(
  largestTurnNum,
  fixedPart,
  appPartHash,
  outcomeHash,
  numStates,
  whoSignedWhat,
  sigs
);

```

---

## Finalize a channel (sad)

The `forceMove` function allows anyone holding the appropriate off-chain state to register a challenge on chain. It is designed to ensure that a state channel can progress or be finalized in the event of inactivity on behalf of a participant (e.g. the current mover).

States and signatures that support a are submitted (in an optimized format), and once relevant checks have passed, an `outcome` is registered against the `channelId`, with a finalization time set at some delay after the transaction is processed. This delay allows the challenge to be cleared by a timely and well-formed [respond](#respond) or [checkpoint](#checkpoint) transaction. We'll get to those shortly. If no such transaction is forthcoming, the challenge will time out, allowing the `outcome` registered to be finalized. A finalized outcome can then be used to extract funds from the channel (more on that below, too).

### Call `forceMove`

:::note
The challenger needs to sign this data:

```
keccak256(abi.encode(challengeStateHash, 'forceMove'))
```

in order to form `challengerSig`. This signals their intent to forceMove this channel with this particular state. This mechanism allows the forceMove to be authorized only by a channel participant.
:::

We provide a handy utility function `signChallengeMessage` to form this signature.

```typescript
// construct some states as per previous tutorial steps. Then:

const variableParts = states.map(state => getVariablePart(state));
const fixedPart = getFixedPart(states[0]);

const challenger = wallets[0]; // Note that this can be *any* participant,
// and need not be the participant who owns this state.

// Sign the states
const signatures = await signStates(states, wallets, whoSignedWhat);
const challengeSignedState: SignedState = signState(
  states[states.length - 1],
  challenger.privateKey
);

const challengeSignature = signChallengeMessage([challengeSignedState], challenger.privateKey);

const tx = NitroAdjudicator.forceMove(
  fixedPart,
  largestTurnNum,
  variableParts,
  isFinalCount,
  signatures,
  whoSignedWhat,
  challengeSignature
);
```

## Clear a challenge

A challenge being registered does _not_ mean that the channel will inexorably finalize. Participants have the timeout period in order to be able to respond. Perhaps they come back online after a brief spell of inactivity, or perhaps the challenger was trying to (maliciously) finalize the channel with a supported but outdated (or 'stale') state.

### Call `checkpoint`

The `checkpoint` method allows anyone with a supported off-chain state to establish a new and higher `turnNumRecord` on chain, and leave the resulting channel in the "Open" mode. It can be used to clear a challenge.

```typescript
// Register a challenge with a very long timeout, following the preceding tutorial step
// Form a new support proof (you should be familiar with how to do this by now) with an increased largestTurnNum
// Submit this transaction:

const tx = NitroAdjudicator.checkpoint(
  fixedPart,
  largestTurnNum,
  variableParts,
  isFinalCount,
  signatures,
  whoSignedWhat
);

await(await tx).wait();

// Form an expectation about the new state of the chain:
const expectedChannelStorageHash = channelDataToChannelStorageHash({
  turnNumRecord: largestTurnNum,
  finalizesAt: 0x0, // 0 here implies the channel is open again.
});

// Check channelStorageHash against the expected value (it is a public mapping)
expect(await NitroAdjudicator.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
```

### Call `respond`

The respond method allows anyone with the appropriate, _single_ off-chain state (usually the current mover) to clear an existing challenge stored against a `channelId`. This might be significantly cheaper than calling checkpoint (it leverages the fact that the chain has already seen a support for the challenge state, so providing a single validTransition from the challenge state to the response state implies the existence of a support proof for the response state).

```typescript
largestTurnNum += 1;
const responseState: State = {
  turnNum: largestTurnNum,
  isFinal: false,
  channel,
  outcome: [],
  appDefinition: process.env.TRIVIAL_APP_ADDRESS,
  appData: HashZero,
  challengeDuration,
};

const responder = wallets[0];
const responseSignature = await signState(responseState, responder.privateKey).signature;
const isFinalAB = [false, false];
const variablePartAB = [
  getVariablePart(challengeSignedState.state),
  getVariablePart(responseState),
];

const tx = NitroAdjudicator.respond(
  challenger.address,
  isFinalAB,
  fixedPart,
  variablePartAB,
  responseSignature
);
await(await tx).wait();

// Form an expectation about the new state of the chain:
const expectedChannelStorageHash = channelDataToChannelStorageHash({
  turnNumRecord: largestTurnNum,
  finalizesAt: 0x0, // 0 here implies the channel is open again.
});

// Check channelStorageHash against the expected value (it is a public mapping)
expect(await NitroAdjudicator.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
```

### Scrape info from Adjudicator Events

You may have noticed that to respond, the challenge state itself must be (re)submitted to the chain. To save gas, information is only stored on chain in a hashed format. Clients should, therefore, cache information emitted in Events emitted by the adjudicator, in order to be able to respond to challenges.

```typescript
// Prepare a forceMove transaction as above, and store the transaction receipt
const receipt = await(
  await NitroAdjudicator.forceMove(
    fixedPart,
    largestTurnNum,
    variableParts,
    isFinalCount,
    signatures,
    whoSignedWhat,
    challengeSignature
  )
).wait();

const event = receipt.events.pop();

// Scrape the information out of the ForceMove event
const {
  channelId: eventChannelId,
  turnNumRecord: eventTurnNumRecord,
  finalizesAt: eventFinalizesAt,
  challenger: eventChallenger,
  isFinal: eventIsFinal,
  fixedPart: eventFixedPart,
  variableParts: eventVariableParts,
} = event.args;
```

---

## Outcomes

So far during this tutorial we have not concerned ourselves with specifying meaningful outcomes on any of our `States`. This has meant that although we have learnt to deposit assets, execute state transitions off chain, and to finalize an outcome via challenge or conclude, no participant could get their funds back out of the state channel and into their ethereum account.

The time has come to tackle this issue!
Nitro protocol is an extension of ForceMove protocol that we have dealt with so far. ForceMove specifies only that a state should have a default `outcome` but does not specify the format of that `outcome`, and simply treats it as an unstructured `bytes` field. In this section we look at the outcome formats needed for Nitro.

### Outcomes that allocate

The following table illustrates an example data structure for an outcome, which features an _allocation_ asset outcome. (For those interested, the giveaway is the `0` in the `AssetOutcome` property. Guarantee asset outcomes, which we will get to shortly, have a `1` there).

:::tip
Nitro supports multiple different assets (e.g. ETH and one or more ERC20s) being held in the same channel.
:::

| >                                                                                               | 0xETHAssetHolder                                 | 0                                                                                                     | 0xDestA     | 5      | 0xDestB     | 2      | 0xDAIAssetHolder | ... |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------- | ------ | ----------- | ------ | ---------------- | --- |
|                                                                                                 |                                                  |                                                                                                       | Destination | Amount | Destination | Amount |                  |     |
|                                                                                                 |                                                  | <td colspan="2" align="center">AllocationItem</td> <td colspan="2" align="center">AllocationItem</td> |             |        |
|                                                                                                 |                                                  | <td colspan="4" align="center">Allocation</td>                                                        |             |        |
|                                                                                                 | <td colspan="5" align="center">AssetOutcome</td> |                                                                                                       |             |
| <td colspan="6" align="center">OutcomeItem</td> <td colspan="6" align="center">OutcomeItem</td> |
| <td colspan="8" align="center">Outcome</td>                                                     |

Such an outcome specifies

- at least one asset holder (which in turn is tied to a specific asset type such as ETH or an ERC20 token)
- for each asset holder, an array of (destination, amount) pairs known as an `Allocation`, and indicating a payout of amount tokens to destination.

The destination here might be an external destination (which means the assets will get paid out to an ethereum address) or a channelId.

:::tip
In nitro protocol, channels can allocate funds to other channels!
:::

To construct an outcome, you can import the `Outcome` type to ensure you're getting the basics right. Then go ahead and attach that outcome in place of the `[]` we used as a placeholder previously on our `States`:

```typescript

import { AllocationAssetOutcome, Outcome, encodeOutcome, decodeOutcome } from '@statechannels/nitro-protocol';

const assetOutcome: AllocationAssetOutcome = {
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS
  allocationItems: [
    {destination: externalDestination, amount: '0x03'}, // 3 wei
    // other payouts go here,
    // e.g. having destination: someOtherExternalDestintion
    // or destination: someChannelId
  ],
};

const outcome: Outcome = [assetOutcome];
// Additional assetOutcomes could be pushed into this array

// Optional: this encoding function is a part of the getVariablePart helper function that we are already using
// So you most likely won't need to use it.
const encodedOutcome = encodeOutcome(outcome);
expect(decodeOutcome(encodedOutcome)).toEqual(outcome);
```

### Outcomes that guarantee

Guarantee Asset Outcomes are similar to Allocation Asset Outcomes, only they not have any amounts. Their purpose is to simply express an ordering of destinations for a given asset holder (say, a given token).

The following table illustrates an example data structure for an outcome, which features an _guarantee_ asset outcome. (This time the giveaway is the `1` in the `AssetOutcome` property).

| >                                                                                               | 0xETHAssetHolder                                 | 1                                             | 0xchannelA                                                       | 0xBob | 0xAlice | 0xDAIAssetHolder | ... |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------- | ----- | ------- | ---------------- | --- |
|                                                                                                 |                                                  |                                               | TargetChannelId <td colspan="2" align="center">Destinations</td> |       |         |
|                                                                                                 |                                                  | <td colspan="3" align="center">Guarantee</td> |                                                                  |       |
|                                                                                                 | <td colspan="4" align="center">AssetOutcome</td> |                                               |                                                                  |
| <td colspan="5" align="center">OutcomeItem</td> <td colspan="5" align="center">OutcomeItem</td> |
| <td colspan="7" align="center">Outcome</td>                                                     |

A channel that has a guarantee outcome is said to be a guarantor channel.

Now while we can _transfer_ assets out of a channel, the terminology is instead to _claim_ on a guarantor channel. Assets will be paid to beneficiaries of the _target_ channel, but in an order of precedence defined by the guarantor. More on this later.

Constructing the right kind of object in typescript is straightforward:

```typescript
import {GuaranteeAssetOutcome} from '@statechannels/nitro-protocol';

const assetOutcome: GuaranteeAssetOutcome = {
  assetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  guarantee: {
    targetChannelId: HashZero,
    destinations: [
      '0x000000000000000000000000000000000000000000000000000000000000000b',
      '0x000000000000000000000000000000000000000000000000000000000000000a',
    ],
  },
};
```

Encoding of all outcomes (including guarantee outcomes) is handled seamlessly by the `getVariablePart` function.

Don't worry if it is not yet clear why we need guarantor channels or outcomes that guarantee. They are a useful tool for virtually funding channels, but can be safely ignored if you are just trying to understand directly funded channels.

## Get your money out

### Using `pushOutcome`

A finalized outcome is stored in two places on chain: first, as a single hash in the adjudicator contract; second, in multiple hashes across multiple asset holder contracts.

The `pushOutcome` method on the `NitroAdjudicator` allows one or more `assetOutcomes` to be registered against a channel in a number of AssetHolder contracts (specified by the `outcome` stored against a channel that has been finalized in the adjudicator).

In this example we will limit ourselves to an outcome that specifies ETH only, and therefore will only be pushing the outcome to a single contract (the `ETHAssetHolder`).

Let us begin with a conclude transaction, following the steps in the tutorial section above. When we finalize a channel this way, the chain stores the timestamp of the current blocknumber. We need to scrape this information from the transaction receipt in order to be able to push the outcome successfully.

```typescript
const tx0 = NitroAdjudicator.conclude(
  largestTurnNum,
  fixedPart,
  appPartHash,
  outcomeHash,
  numStates,
  whoSignedWhat,
  sigs
);
const receipt = await(await tx0).wait();

const channelId = getChannelId(channel);
const turnNumRecord = 0; // Always 0 for a happy conclude
const finalizesAt = (await provider.getBlock(receipt.blockNumber)).timestamp;
const stateHash = HashZero; // Reset in a happy conclude
const challengerAddress = AddressZero; // Reset in a happy conclude
const outcomeBytes = encodeOutcome(state.outcome);

const tx1 = NitroAdjudicator.pushOutcome(
  channelId,
  turnNumRecord,
  finalizesAt,
  stateHash,
  challengerAddress,
  outcomeBytes
);

await(await tx1).wait();
```

### Using `transferAll`

The `transferAll` method is available on all asset holders, including the `ETHAssetHolder`. It pays out assets according to outcomes that it knows about, if the channel is sufficiently funded.

```typescript
import {encodeAllocation} from '@statechannels/nitro-protocol';

const amount = '0x03';

const EOA = ethers.Wallet.createRandom().address;
const destination = hexZeroPad(EOA, 32);

const assetOutcome: AllocationAssetOutcome = {
  assetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [{destination, amount}],
};

// Following earlier tutorials ...
// tx0 fund a channel
// tx1 conclude this channel with this outcome
// tx2 pushOutcome to the ETH_ASSET_HOLDER
// ...

const tx3 = ETHAssetHolder.transferAll(channelId, encodeAllocation(assetOutcome.allocationItems));

const {events} = await(await tx3).wait();

expect(events).toMatchObject([
  {
    event: 'AssetTransferred',
    args: {
      channelId,
      destination: destination.toLowerCase(),
      amount: {_hex: amount},
    },
  },
]);

expect(bigNumberify(await provider.getBalance(EOA)).eq(bigNumberify(amount)));
```

:::tip
If the destination specified in the outcome is external, the asset holder pays out the funds (as in the example above). Otherwise the destination is a channel id, and the contract updates its internal accounting such that this channel has its direct funding increased.
:::

:::tip
This method executes payouts that might benefit multiple participants. If multiple actors try and call this method, after the first transaction is confirmed the remaining ones may fail.
:::

### Using `claimAll`

The `claimAll` method will pay out the funds held against a guarantor channel, according to a _target_ channel's outcome but with an preference order controlled by the guarantor channel.

```typescript
import {encodeAllocation} from '@statechannels/nitro-protocol';

const amount = '0x03';

const EOABob = ethers.Wallet.createRandom().address;
const destination = hexZeroPad(EOA, 32);

const assetOutcome: AllocationAssetOutcome = {
  assetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [{destination, amount}],
};

// Following earlier tutorials ...
// tx0 finalize a channel that allocates to Alice then Bob
// tx1 pushOutcome to the ETH ASSET HOLDER
// tx2 finalize a guarantor channel that targets the first channel
// and reprioritizes Bob over Alice
// tx3 pushOutcome to the ETH_ASSET_HOLDER
// tx4 fund the guarantor channel
// ...

const tx5 = ETHAssetHolder.claimAll(gurantorChannelId, // TODO);

const {events} = await(await tx5).wait();

expect(events).toMatchObject([
  {
    event: 'AssetTransferred',
    args: {
      channelId,
      destination: destination.toLowerCase(),
      amount: {_hex: amount},
    },
  },
]);

expect(bigNumberify(await provider.getBalance(EOABob)).eq(bigNumberify(amount)));
```

If this process seems overly complicated to you: remember that guarantor channels are only required when virtually funding a channel. Also bear in mind that this process is unlinkely to actually play out on chain very often: it is in everyone's interest to administrate inter-channel funding off chain as much as possible, with the on chain administration such as this used as a last resort.

### Using `pushOutcomeAndTransferAll`

Instead of pushing the outcome from the adjudicator to the asset holder in one transaction, and _then_ transferring the assets out of a channel according to that outcome, it is more convenient to use the adjudicator's `pushOutcomeAndTransferfAll` method, which will do both in one go and save gas, to boot.

### Using `concludePushOutcomeAndTransferAll`

If we have a finalization proof, then we can call `condludePushOutcomeAndTransferAll` to do the channel close, outcome push and payouts in one transaction.
