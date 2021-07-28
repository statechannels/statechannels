# ForceMove Implementation Notes

Active set of notes explaining the ForceMove implementations.

The goal is to make a close-to-optimal implementation of the force-move protocol on the EVM.

## How to get the outcome from a finalized channel

While channel settlement is out of the scope of this piece of work, we will need to interface with the channel funding and settlement layer at a later point.

The strategy here will be to have a method that can be called when a channel is finalized, which will be responsible for interfacing. The precise details of this method will depend on the settlement layer. A few options here include (a) having an `assertOutcome` method which is passed an outcome and returns true if that is the outcome that was finalized or (b) having a `pushOutcome` method, which pushes the outcome into one or more other contracts in the settlement layer.

_Q: Is it inefficient to require a method call for this purpose?_ A: Probably not - settlement has to take place on-chain anyway, so this method call could be subsumed into the first step of the settlement process.

## Let's try to minimize storage

We have two key questions to answer (along with a couple of other minor decisions):

1. What should be the composition of the `channelStorageHash` (i.e. in precisely what order/combination should we hash quantities together to form the root hash)
2. What should be the composition of the `stateHash` (the thing that the participants sign)

There are lots of possibilities here. To decide between them we need to examine exactly how the quantities will be used.
To do this we will look at both what the methods need from the channel storage and what the methods need from the channels passed in.

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
- checkpoint
  - Can deduce `turnNumRecord`
  - Needs to read `finalizesAt`
- Refute
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
- checkpoint
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

## ForceMove interface

With these considerations in mind, the ForceMove interface should be something like the below. See `.sol` file in this directory for a sketch of the implementation.

### Types and storage

```javascript
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct FixedPart {
        string chainId;
        address[] participants;
        uint256 channelNonce;
        address appDefinition;
        uint256 challengeDuration;
    }

    struct VariablePart {
        bytes outcome;
        bytes appData;
    }


    struct State {
        // participants sign the hash of this
        uint256 turnNum;
        bool isFinal;
        bytes32 channelId; // keccack(chainId,participants,channelNonce)
        bytes32 appPartHash; // hash(challengeDuration, appDefinition, appData)
        bytes32 outcomeHash;
    }

    struct ChannelData {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        bytes32 outcomeHash;
    }

    mapping(bytes32 => bytes32) public channelStorageHashes;

```

## Unanswered Questions

1. Should we use time or blocknumber? Time is generally more predictable and nicer to work with in client code but is manipulable by miners :(.
2. Is it worth optimizing separately for the case n=2 (e.g. with methods `challenge2` and so on)
3. What order should we put states in? (Maybe reverse?)
4. Should we use abi encode?
5. We don't technically need to pass the `isFinal` flag into `conclude` - it will only work if it is true. Maybe that's a step too far?
6. Can we optimize the checking signatures algorithm by reordering the states/sigs array before passing them in?
