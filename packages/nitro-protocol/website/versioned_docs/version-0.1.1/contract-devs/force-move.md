---
id: version-0.1.1-force-move
title: ForceMove.sol
original_id: force-move
---

ForceMove.sol is a base contract that is not actually deployed: it is inherited by NitroAdjudicator.sol, which is deployed.

ForceMove is a state channel execution framework. It:

1. Specifies a programmable state format and state transition rules;
2. Specifies a format for the data stored on chain against each channel;
3. Enables disputes to be raised and adjudicated;
4. Allows for a final **outcome** to be registered against a unique `channelId`.

This page documents our reference implementation in `ForceMove.sol`: please also see the [API](../contract-api/natspec/ForceMove).

---

## State Format

A specified format of _state_ is vital, since it constitutes much of the interface between the on- and off- chain behavior of the state channel network.

In ForceMove, the following fields must be included in state updates:

| **Field**         | **Data type** | **Definition / Explanation**                                  |
| ----------------- | ------------- | ------------------------------------------------------------- |
| chainId           | `uint256`     | e.g. 3 (ropsten) or 1 (mainnet)                               |
| participants      | `address[]`   | participant addresses                                         |
| channelNonce      | `uint256`     | chosen by participants to make ChannelId unique               |
| challengeDuration | `uint256`     | duration of challenge (in seconds)                            |
| turnNum           | `uint256`     | turn number                                                   |
| outcome           | `bytes`       | the _outcome_ if the channel were to finalize in this state   |
| isFinal           | `boolean`     | is this state final?                                          |
| appDefinition     | `address`     | on-chain address of library defining custom application rules |
| appData           | `bytes`       | application-specific data                                     |

Since states must ultimately be interpreted by the adjudicator, the encoding of these fields must be carefully considered. The following encoding is designed around optimal gas consumption:

```solidity
    struct State {
        // participants sign the hash of this
        uint256 turnNum;
        bool isFinal;
        bytes32 channelId; // keccack256(abi.encode(chainId, participants, channelNonce))
        bytes32 appPartHash;
        //     keccak256(abi.encode(
        //         fixedPart.challengeDuration,
        //         fixedPart.appDefinition,
        //         variablePart.appData
        //     )
        // )
        bytes32 outcomeHash; //  keccak256(abi.encode(outcome))
    }
```

### `channelId`

The id of a channel is the hash of the abi encoded `chainId`, `participants` and `channelNonce`.

By choosing a new `channelNonce` each time the same participants execute a state channel supported by the same chain, they can avoid replay attacks.

### Fixed and Variable Parts

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

which contains fields which are allowed to change. These structs, along with remaining fields, `turnNum` and `isFinal`, can be passed in to contract methods for more gas efficient execution.

### Implementation FAQs

**Why include the `channelId` in the State, rather than its pre-image?** It is necessary for the chain to calculate (and hence store in memory) the `channelId` for every state-changing method, in order to read the correct slot from storage. When computing the hash of a State struct (which often happens next), it is more efficient (in terms of gas consumption) to reuse `channelId`, rather than to (re)hash the pre-image of `channelId` along with the rest of the data. This is because `channelId` is generally shorter than its pre-image, and the gas costs of hashing increase with the length of the input.

**Why not include the `appDefinition` in the `channelId`?** The `appDefinition` is fixed as part of the transition rules, so it seems like it would make sense to include it in the `channelId`. However, this would rule out participants being able to collaboratively upgrade the app without refunding the channel.

**Why not hash the `appDefinition` together with the `channelId` into a `fixedPartHash`?** By doing this you perform one extra hash but you have to hash less data in the variable part. This tradeoff makes sense if you're hashing something like >3 variable parts for the same fixed part (based on the relative gas costs). We anticipate that most of the time channels will have 2 participants, so we optimize for this case.

**Why not include `turnNum` or `isFinal` in the `variablePartHash`?** Having the `turnNum` and `isFinal` separate makes the `conclude` method more efficient, as it can pass in just the `variablePartHash` and not the (potentially large) data within it.

**What happened to the "commitment" terminology?**
This has been deprecated in favor of "state".

---

## Transition Rules

In ForceMove, every state has an associated 'mover' - the participant who had the unique ability to progress the channel at the point the state was created. The mover can be calculated from the `turnNum` and the `participants` as follows:

```solidity
moverAddress = participants[turnNum % participants.length]
```

The implication of this formula is that participants take turns to update the state of the channel. Furthermore, there are strict rules about whether a state update is valid, based on the previous state that has been announced. Beyond conforming to the state format, there are certain relationships that must hold between the state in question, and the previously announced state.

### Core transition rules

The full rule set is:

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

### Core `_validTransition`

The actual signature for the internal, core `_validTransition` function makes use of the `VariablePart` struct defined in the section on [state format](#state-format).

In `/contracts/ForceMove.sol`:

```solidity
    function _validTransition(
        uint256 nParticipants,
        bool[2] memory isFinalAB, // [a.isFinal, b.isFinal]
        ForceMoveApp.VariablePart[2] memory ab, // [a,b]
        uint256 turnNumB,
        address appDefinition
    ) internal pure returns (bool)
```

A later [check for support](#support-proofs) for the submitted states implies (if it passes) that the following fields are equal for a and b:
`chainId`, `participants`, `channelNonce`, `appDefinition`, `challengeDuration`, and that `b.turnNum = a.turnNum + 1`. This is because the `stateHashes` are computed on chain from a single `fixedPart` which is submitted (and implicitly copied across all states) as well as a single `largestTurnNum` (which is implicitly decremented as we step back through the submitted states). This means that the core `_validTransition` function need only perform the remaining checks. See the contract itself for the full implementation.

### `_validTransitionChain`

The definition above applies to a pair of `States`. It is often necessary to verify that a list of `States` has the property that the second `State` in each consecutive pair is a `validTransition`from the first.

```solidity
    function _validTransitionChain(
        // returns stateHashes array (implies true) else reverts
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount,
        bytes32 channelId,
        FixedPart memory fixedPart
    ) internal pure returns (bytes32[] memory)
```

---

## Support Proofs

As we will see in the method definitions later, in order for the chain to accept a channel state, `s`, that channel state must be _supported_ by `n` signatures (where `n = participants.length`).
The simplest way for this to accomplish this is to provide a sequence of `n` states terminating is state `s`, where each state is signed by its mover and each consecutive pair of states form a valid transition.

ForceMove also allows an optimization where a state can be supported by `n` signatures on a sequence of `m < n` states, provided again that each consecutive pair of those `m` states form a valid transition and further provided each participant has provided a signature on a state later or equal in the sequence than the state for which they were the mover.
In the extreme, this allows a single state signed by all `n` parties to be accepted by the chain.

### `_stateSupportedBy`

```solidity
    function _stateSupportedBy(
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount,
        bytes32 channelId,
        FixedPart memory fixedPart,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat // whoSignedWhat[i] is the index of the state in stateHashes that was signed by participants[i]
    ) internal pure returns (bytes32)
```

Implementation:

- Check states form a valid transition chain and calculate `stateHashes`, by calling `_validTransitionChain`.
- Check the signatures on the stateHashes are correct by requiring `_validSignatures`.
- If checks pass, returns the final element in the `stateHashes` array.

### `_validSignatures`

Given an array of state hashes, checks the validity of the supplied signatures.

:::warning
Does not check the states to see if they form a chain of valid transitions.
:::

Internal call

```solidity
    function _validSignatures(
        uint256 largestTurnNum,
        address[] memory participants,
        bytes32[] memory stateHashes,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat // whoSignedWhat[i] is the index of the state in stateHashes that was signed by participants[i]
    ) internal pure returns (bool)
```

Each signature is a struct:

```solidity
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
```

Requirements:

- There is a signature for each participant:
  - either on the hash of the state for which they are a mover
  - or on the hash of a state that appears after that state in the array

Implementation:

1. is `whoSignedWhat` acceptable?
   - see [below](#_acceptablewhosignedwhat)
2. Did who actually sign what?
   - For each i from `0 .. (n - 1)`:
     - Does `participants[i] == recoverSigner(stateHashes[whoSignedWhat[i]], sigs[i])`

Some examples:

In the following examples, we will let `n` be the number of participants in the channel.
We format the signatures `sigs` as an array of signatures, where `sigs[i]` are signatures for states `states[i]`.

Use the notation that `si` represents a state with `turnNum = i` and `xi` is a signature of participant `i` on the corresponding state.

Example 1: Suppose that `n = 3`, `states = [s4, s5]` and `sigs = [[x1], [x0, x2]]`.

In order for signatures to be valid, we need that:

- Participant 2 has signed `s5`
- Participant 1 has signed `s4` or `s5`
- Participant 0 has signed `s4` or `s5` (as `s3` hasn't been provided)

So the signatures are valid in this case

### `_acceptableWhoSignedWhat`

```solidity
    function _acceptableWhoSignedWhat(
        uint8[] memory whoSignedWhat,
        uint256 largestTurnNum,
        uint256 nParticipants,
        uint256 nStates
    ) internal pure returns (bool)
```

Implementation: - Let `m` be the number of states passed in - Let `n` be the number of participants - Require `whoSignedWhat.length == n` (Namely, there must be precisely one signature for each participant). - For each `participant[i]`: - Calculate `offset = (largestTurnNum - i) % n` - If `offset >= m - 1` then they can sign any state - Else they should have signed state `m - 1 - offset` or highe r

Example of whether `whoSignedWhat` is acceptable:

- Suppose: `m = 2`, `n = 3`, `largestTurnNum = 5`.
- `offset = [2, 1, 0]`
- so participant `[0, 1 ,2]` should have signed `[{0, 1}, {0, 1}, {1}]` respectively.
- so valid `whoSignedWhat`s are all combinations:

```
[0, 0, 1] => true
[1, 1, 1] => true
[1, 0, 1] => true
[0, 1, 1] => true
```

---

## Channel Storage

The adjudicator contract stores

- `uint48 turnNumRecord`
- `uint48 finalizesAt`
- `uint160 fingerprint`

serialized, inside the following mapping (with `channelId` as the key):

```solidity
    mapping(bytes32 => bytes32) public channelStorageHashes;
```

The `fingerprint` uniquely identifies the channel's current state, up to hash collisions.

### `turnNumRecord`

`turNumRecord` is the highest turn number that is known to the chain to be supported by a full set of signatures.
The exception to this rule is that it is set to `0` when the channel is concluded via a `conclude` call.

For example, the `turnNumRecord` might be increased by a submitted transaction including

- a `validTransition` m-chain (i.e. an ordered list of `m <= n` states such that each state in the list is a valid transition from its predecessor), and
- `n` signatures such that each participant has signed the state in the m-chain for which they are a mover (or a later one)

One example of this is a transaction including a single state signed by all `n` participants.

Note that a new `validTransition` `m`-chain may be implied by a single, signed state that is a validTransition from a state already supported on-chain: and hence the `turnNumRecord` can be incremented by a `respond` transaction.

### Channel Modes

- **Open** if and only if `finalizesAt` is null
  - implies that `stateHash` and `challengerAddress` are also null
- **Challenge** if and only if `finalizesAt < currentTime`
  - implies that all other fields are not null
- **Finalized** if and only if `finalizesAt >= currentTime`
  - implies that all other fields are not null

These states can be represented in the following state machine:

<div class="mermaid">
graph LR
linkStyle default interpolate basis
Open -->|forceMove| Challenge
Open -->|checkpoint| Open
Open-->|conclude| Finalized
Challenge-->|forceMove| Challenge
Challenge-->|respond| Open
Challenge-->|checkpoint| Open
Challenge-->|conclude| Finalized
Challenge-->|timeout| Finalized
</div>

Storage costs on-chain are high and tend to dwarf other gas fees. The implementation therefore minimizes on-chain storage as much as possible.

ForceMove requires certain data to be available on-chain.

The value of `channelStorageHashes[someChannelId]` is obtained by:

- setting the most significant 48 bits to the `turnNumRecord`
- setting the next most significant 48 bits to `finalizesAt`
- setting the next most significant 160 bits to the `fingerprint`

The `fingerprint` is the 160 least significant bits of `keccak256(abi.encode(channelData))`, where `channelData` is a struct of type

```solidity
    struct ChannelData {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash // keccak256(abi.encode(Outcome));
    }
```

When the adjudicator needs to verify the exact state or outcome, the data is provided in the function arguments, as part of the `calldata`. The chain will then check that the hydrated data hashes to the image that has been stored.

### FAQs

**Why include the `outcomeHash`?**

Although the `outcome` is included in the `state`, we include the `outcomeHash` at the top level of the `channelStorageHash` to make it easier for the [`pushOutcome`](./nitro-adjudicator#push-utcome) method to prove what the outcome of the channel was. The tradeoff here is that the methods need to make sure they have the data to calculate it - which adds at most a `bytes32` to their `calldata`.

---

## Methods

### `forceMove`

The `forceMove` function allows anyone holding the appropriate off-chain state to register a challenge on chain, and gives the framework its name. It is designed to ensure that a state channel can progress or be finalized in the event of inactivity on behalf of a participant (e.g. the current mover).

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, an `outcome` is registered against the `channelId`, with a finalization time set at some delay after the transaction is processed. This delay allows the challenge to be cleared by a timely and well-formed [respond](#respond) or [checkpoint](#checkpoint) transaction. If no such transaction is forthcoming, the challenge will time out, allowing the `outcome` registered to be finalized. A finalized outcome can then be used to extract funds from the channel.

```solidity
    function forceMove(
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        Signature memory challengerSig
    ) public
```

Check:

- `largestTurnNum` is greater than or equal to the stored value of `turnNumRecord`
- Channel is not finalized
- States and signatures support the challenge state (the maximal state)
- `challengerSig` proves that some participant signed the challenge state.

Effects:

- Sets or updates the following ChannelData properties:
  - `turnNumRecord` to the `largestTurnNum`
  - `finalizesAt` to `currentTime` + `challengeInterval`
  - `stateHash`
  - `challengerAddress`
- Emit a `ChallengeRegistered` event

:::note
The challenger needs to sign this data:

```
keccak256(abi.encode(challengeStateHash, 'forceMove'))
```

in order to form `challengerSig`. This signals their intent to forceMove this channel with this particular state. This mechanism allows the forceMove to be authorized only by a channel participant.
:::

### `respond`

The respond method allows anyone with the appropriate, single off-chain state (usually the current mover) to clear an existing challenge stored against a `channelId`.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, the existing challenge is cleared and the `turnNumRecord` is incremented by one.

```solidity
function respond(
    address challenger,
    bool[2] memory isFinalAB, // [challengeStateIsFinal, responseStateIsFinal]
    FixedPart memory fixedPart,
    ForceMoveApp.VariablePart[2] memory variablePartAB, // [challengeState, responseState]
    Signature memory sig
)
```

Requirements:

- `challengeState` matches `stateHash`,
- `challengeState` to `responseState` is a valid transition,
- Channel is in Challenge mode.

Effects:

- Clears challenge,
- Increments `turnNumRecord`.

Implementation:

- Calculate `channelId` from fixedPart
- Calculate `challengeStateHash` and `challengeStateOutcome` from `fixedPart, challengeVariablePart, turnNumRecord, challengStateIsFinal`
- Calculate `storageHash = hash(turnNumRecord, finalizesAt, challengeStateHash, challengeStateOutcome)`
- Check that `finalizesAt > now`
- Check that `channelStorageHashes[channelId] == storageHash`
- Calculate `responseStateHash`
- Recover the signer from the `responseStateHash` and check that they are the mover for `turnNumRecord + 1`
- Check `validTransition(nParticipants, isFinalAB, variablePartAB, appDefiintion)`
- Set channelStorageHashes:
  - `turnNumRecord += 1`
  - Other fields set to their null values (see [Channel Storage](./force-move#channel-storage)).

### `conclude`

If a participant signs a state with `isFinal = true`, then in a cooperative channel-closing procedure the other players can countersign that state and broadcast it. Once a full set of `n` such signatures exists \(this set is known as a **finalization proof**\) anyone in possession may use it to finalize the channel on-chain. They would do this by calling `conclude` on the adjudicator.

:::tip
In Nitro, the existence of this possibility can be relied on \(counterfactually\) to [close a channel off-chain](../client-specification/auxiliary-protocols#closing-off-chain).
:::

The conclude methods allow anyone with sufficient off-chain state to immediately finalize an outcome for a channel without having to wait for a challenge to expire.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, an expired challenge is stored against the `channelId`.

```solidity
    function conclude(States states, Signatures sigs)
```

Checks:

- Channel is not finalized
- A finalization proof has been provided

Effects:

- Sets `finalizesAt` to current time
- Sets `outcomeHash` to be consistent with finalization proof
- Clears `stateHash`
- Clears `turnNumRecord`
- Clears `challengerAddress`

### `checkpoint`

The `checkpoint` method allows anyone with a supported off-chain state to establish a new and higher `turnNumRecord` and leave the resulting channel in the "Open" mode.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, the `turnNumRecord` is updated, and a challenge, if exists is cleared.

```solidity

    function checkpoint(
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
    )
```

Requirements:

- The channel is not finalized
- The `largestTurnNum` > `turnNumRecord`
- States and signatures support the last state

Effects:

- Increases `turnNumRecord`.
- Clears challenge, when exists.
