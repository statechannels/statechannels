# ForceMove Implementation Notes

Active set of notes explaining the ForceMove implementations.

The goal is to make a close-to-optimal implementation of the force-move protocol on the EVM.

## How to get the outcome from a finalized channel

While channel settlement is out of the scope of this piece of work, we will need to interface with the channel funding and settlement layer at a later point.

The strategy here will be to have a method that can be called when a channel is finalized, which will be responsible for interfacing. The precise details of this method will depend on the settlement layer. A few options here include (a) having an `assertOutcome` method which is passed an outcome and returns true if that is the outcome that was finalized or (b) having a `pushOutcome` method, which pushes the outcome into one or more other contracts in the settlement layer.

_Q: Is it inefficient to require a method call for this purpose?_ A: Probably not - settlement has to take place on-chain anyway, so this method call could be subsumed into the first step of the settlement process.

## Let's try to minimize storage

Storage costs on-chain are high and tend to dwarf other gas fees. We therefore start by trying to minimize on-chain storage as much as possible.

As seen in the spec, ForceMove requires certain data to be available on-chain.
In a naive implementation we would expect something like the following to be stored for each channel:

```
struct ChannelStorage {
  uint256 turnNumRecord;
  uint256 finalizesAt;
  State storedState;
  address challengerAddress;
}

mapping(address => ChannelStorage) channelStorages;
```

**The key idea of this section is to store a hash of this data, instead of storing the data itself.** The actual data can then be provided as required to each method, as part of the calldata.

Instead of the naive storage implementation above, we can store the hash of the state in the struct, and store the hash of that struct in the mapping:

```
struct ChannelStorage {
  uint256 turnNumRecord;
  uint256 finalizesAt;
  bytes32 stateHash;
  address challengerAddress;
}

mapping(address => bytes32) channelStorageHashes;
```

We have two key questions to answer (along with a couple of other minor decisions):

1. What should be the composition of the `channelStorageHash` (i.e. in precisely what order/combination should we hash quantities together to form the root hash)
2. What should be the composition of the `stateHash` (the thing that the participants sign)

There are lots of possibilities here. To decide between them we need to examine exactly how the quantities will be used.
To do this we will look at both what the methods need from the channel storage and what the methods need from the channels passed in.

### `turnNumRecord`

`turNumRecord` is the highest turn number that has been established on chain. Established here means being the turnNum of a state submitted to the chain in a transaction and either

- featuring in a valid n-chain (i.e. an ordered list of n states each signed by their respective participants, and such that each state in the list is a valid transition from its predecessor), or

- being the turn number of a single state signed by all `n` participants.

Note that a new valid n-chain may be implied by a single, signed state that is a validTransition from the final state of a previously established n-chain: and hence the `turnNumRecord` can be incremented by a `respond` transaction.

### What do the methods need from the channel storage?

Here we look at which parts of the channel storage the methods actually need to read and which parts can be 'deduced' from the context.

Parts that can be 'deduced' do not need to be passed in.
For example, as ForceMove only works if the channel is open, which implies that all fields apart from `turnNumRecord` are null, we don't need to provide the other fields: if the `channelStorageHash` doesn't match one where all fields are null we know we can't proceed.

- ForceMove
  - Can deduce all fields apart from `turnNumRecord` (they must all be null)
  - Needs to read `turnNumRecord`
- Response
  - Can deduce `turnNumRecord` (as the response turnNum must be exactly one more)
  - Needs to read complete `state` and `finalizesAt`
- RespondFromAlternative
  - Can deduce `turnNumRecord`
  - Needs to read `finalizesAt`
- Refute
  - Can deduce `challengerAddress` (from recoverSignature)
  - Needs to read `turnNumRecord`, `finalizesAt`
- ConcludeFromOpen
  - Can deduce all fields apart from `turnNumRecord` (they must all be null)
  - Needs to read `finalizesAt`
- ConcludeFromChallenge
  - Needs to read `finalizesAt`
- PushOutcome (or whatever)
  - Needs to read `outcome`

From this we get the following properties that we want for the `channelStorageHash`

- We want it to be efficient to prove that an outcome was part of a state.
- We want it to be efficient to calculate without having to pass in the full `storedState`

### Proposal for `ChannelStorageHash`

The `ChannelStorageHash` is the hash of:

- `turnNumRecord`
- `finalizesAt`
- `stateHash`
- `challengerAddress`
- `outcomeHash`

**Why include the `outcomeHash`?** Although the `outcome` is included in the `state`, we include the `outcomeHash` at the top level of the `channelStorageHash` to make it easier for the PushOutcome method to prove what the outcome of the channel was. The tradeoff here is that the methods need to make sure they have the data to calculate it - which adds at most a `bytes32` to their calldata.

### What else do the methods need?

- ForceMove
  - Needs to be passed a sequence of up to n full states
  - The states all share the same `chainId`, `participants`, `channelNonce` and `appDefinition`
  - The `turnNum` must increase by 1 each time
  - `isFinal` can transition from 0 to 1 at one point
  - Need `outcome` and `appData` for each state
  - Needs n distinct signatures
- Respond
  - Needs one full state
- RespondFromAlternative
  - Needs to be passed a sequence of n full states
- Refute
  - Needs a proof of signature of higher state
  - So we just need to see the turnNum
- Conclude
  - Can deduce all states after the first (as they're the same apart from an increasing turn number)
  - Needs to know is final
  - Doesn't need the details of outcome or appData
  - Needs to set the outcomehash

From this we can say the following about the way we chose to hash states:

- It should be efficient to calculate multiple state hashes for consecutive states, for signature verification => we want to hash all of the fixed parts together (actually if there are < 3 states, it's probably cheaper to add the app def at the top level instead of another hash)
- We're always going to have to calculate the channelId anyway => the hash of the fixed parts might as well contain the hash of the channelId
- We want to be able to prove that the outcome is part of the channelStatus
- Want to be able to succinctly prove that someone signed a later state => turnNum should be separate

### Proposal for state hash

The data that the participants sign should be the hash of the following:

- TurnNum
- isFinal
- AppDefinition
- ChannelId
  - ChainId
  - Participants
  - ChannelNonce
- VariablePartHash
  - OutcomeHash
  - AppData

Where an item has nested children this implies that item is the hash of the children.

**Why include the ChannelId separately?** We have to calculate the `channelId` for every single operation anyway. Given that we have it it's cheaper to hash in the hash, rather than the individual components again.

**Why not include the `AppDefinition` in the `ChannelId`?** The `AppDefinition` is fixed as part of the transition rules, so it seems like it would make sense to include it in the `ChannelId`. This would rule out participants being able to collaboratively upgrade the app without refunding the channel through.

**Why not hash the `AppDefinition` together with the `ChannelId` into a `FixedPartHash`?** By doing this you perform one extra hash but you have to hash less data in the variable part. This tradeoff makes sense if you're hashing something like >3 variable parts for the same fixed part (based on the relative gas costs). We anticipate that most of the time channels will have 2 participants, so we optimize for this case.

**Why not include `TurnNum` or `isFinal` in the `VariablePartHash`?** Having the `turnNum` and `isFinal` separate makes the `conclude` and `refute` methods more efficient, as they can pass in just the `VariablePartHash` and not the (potentially large) data within it.

## Checking signatures

Checking signatures is likely to be a signification part of the logic. Here's a potential algorithm:

1. Let `nStates` be the number of states in the `states` array.
   - Note that we assume that it has already been determined that these states form a chain of valid transitions and therefore must have incrementing turn numbers.
2. Assume that `Signatures` takes the format of an array of length `nStates` where each element is an array of signatures on the corresponding state i.e. `sigs[i]` is an array of signatures on state `states[i]`.
   - Note that it's possible for `states[i]` to be empty for some `i`.
3. Let `nParticipants` be the number of participants.
   - Note that we should have that `nStates <= nParticipants` and that the total number of signatures provided should be equal to `nParticipants`
4. Let `hasSigned` be a boolean array of length `m` initialized to `false`.
5. Let `maxTurnNum = states[states.length - 1].turnNum`.
6. For `i = nStates - 1; i >= 0; i++`:
   1. For `j = 0; j < signatures[i].length; j++`:
      1. Determine that `signatures[i][j]` is a valid signature for some participant on state `states[i]`. Let `p` be the index of this participant in the channel's particpants array.
      1. Set the bit `hasSigned[(p - maxTurnNum - 1) % n]`.
   2. Fail unless `hasSigned[i - nStates + nParticipants]` is set.
7. Fail unless `hasSigned[0..(nParticipants - nStates - 1)]` are all set.
8. Return true

**Can we optimize this further by changing the way states / sigs are passed in?** For example passing the arrays in last-state-first might help.

## ForceMove interface

With these considerations in mind, the ForceMove interface should be something like the below. See `.sol` file in this directory for a sketch of the implementation.

### Types and storage

```javascript

    struct Signature {
        bytes32 msgHash; // TODO probably doesn't belong here
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct FixedPart {
        string chainId;
        address[] participants;
        uint256 channelNonce;
        address appDefinition;
    }

    struct VariablePart {
        bytes32 outcomeHash;
        bytes32 apppData;
    }

    struct State {
        // participants sign this
        uint256 turnNum;
        bool isFinal;
        address appDefinition;
        bytes32 channelId; // keccack(chainId,participants,channelNonce)
        bytes32 variablePartHash; //keccak256(abi.encode(VariablePart))
    }

    struct ChannelStorage {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash;
    }

    mapping(bytes32 => bytes32) public channelStorageHashes;

    uint256 challengeInterval = 1 minutes;

```

### Public methods:

```javascript
function forceMove(
        uint256 turnNumRecord,
        FixedPart memory fixedPart,
        VariablePart[] memory variableParts,
        uint256 newTurnNumRecord,
        bool[] memory isFinals,
        Signature[] memory sigs,
        Signature memory challengerSig
    ) public;

```

### Internal methods:

```javascript
  function _isAParticipant(address suspect, address[] memory addresses) internal pure returns (bool);

  function _validNChain(
      bytes32 channelId,
      FixedPart memory fixedPart,
      VariablePart[] memory variableParts,
      uint256 newTurnNumRecord,
      bool[] memory isFinals,
      Signature[] memory sigs,
      address[] memory participants
  ) internal pure returns (bool);

  function _validUnanimousConsensus(
      bytes32 channelId,
      FixedPart memory fixedPart,
      VariablePart memory variablePart,
      uint256 newTurnNumRecord,
      bool isFinal,
      Signature[] memory sigs,
      address[] memory participants
  ) internal pure returns (bool);

```

## Unanswered Questions

1. Should we use time or blocknumber? Time is generally more predictable and nicer to work with in client code but is manipulable by miners :(.
2. Is it worth optimizing separately for the case n=2 (e.g. with methods `forceMove2` and so on)
3. What order should we put states in? (Maybe reverse?)
4. Should we use abi encode?
5. We don't technically need to pass the `isFinal` flag into `conclude` - it will only work if it is true. Maybe that's a step too far?
6. Can we optimize the checking signatures algorithm by reordering the states/sigs array before passing them in?
