---
id: execute-state-transitions
title: Execute state transitions off chain
---

## Construct a State with the correct format

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

## Fixed and Variable Parts

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

## Conform to an on chain `validTransition` function

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

## Support a state in several different ways

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
