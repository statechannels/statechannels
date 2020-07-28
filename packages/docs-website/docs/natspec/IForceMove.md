---
id: IForceMove
title: IForceMove.sol
---

View Source: [contracts/interfaces/IForceMove.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/interfaces/IForceMove.sol)

**↘ Derived Contracts: [ForceMove](ForceMove.md)**

The IForceMove contract abstraction defines the interface that an implementation of ForceMove should implement. ForceMove protocol allows state channels to be adjudicated and finalized.

---

## **Enums**
### ChannelMode

```solidity
enum ChannelMode {
 Open,
 Challenge,
 Finalized
}
```

## Structs
### Signature

```solidity
struct Signature {
 uint8 v,
 bytes32 r,
 bytes32 s
}
```

### FixedPart

```solidity
struct FixedPart {
 uint256 chainId,
 address[] participants,
 uint48 channelNonce,
 address appDefinition,
 uint48 challengeDuration
}
```

### State

```solidity
struct State {
 uint48 turnNum,
 bool isFinal,
 bytes32 channelId,
 bytes32 appPartHash,
 bytes32 outcomeHash
}
```

### ChannelData

```solidity
struct ChannelData {
 uint48 turnNumRecord,
 uint48 finalizesAt,
 bytes32 stateHash,
 address challengerAddress,
 bytes32 outcomeHash
}
```

## Events

```solidity
event ChallengeRegistered(bytes32 indexed channelId, uint48  turnNumRecord, uint48  finalizesAt, address  challenger, bool  isFinal, struct IForceMove.FixedPart  fixedPart, struct ForceMoveApp.VariablePart[]  variableParts, struct IForceMove.Signature[]  sigs, uint8[]  whoSignedWhat);
event ChallengeCleared(bytes32 indexed channelId, uint48  newTurnNumRecord);
event Concluded(bytes32 indexed channelId);
```

## Functions

- [forceMove](#forcemove)
- [respond](#respond)
- [checkpoint](#checkpoint)
- [conclude](#conclude)

---

### forceMove

Registers a challenge against a state channel. A challenge will either prompt another participant into clearing the challenge (via one of the other methods), or cause the channel to finalize at a specific time.

```solidity
function forceMove(struct IForceMove.FixedPart fixedPart, uint48 largestTurnNum, struct ForceMoveApp.VariablePart[] variableParts, uint8 isFinalCount, struct IForceMove.Signature[] sigs, uint8[] whoSignedWhat, struct IForceMove.Signature challengerSig) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| largestTurnNum | uint48 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| variableParts | struct ForceMoveApp.VariablePart[] | An ordered array of structs, each decribing the properties of the state channel that may change with each state update. | 
| isFinalCount | uint8 | Describes how many of the submitted states have the `isFinal` property set to `true`. It is implied that the rightmost `isFinalCount` states are final, and the rest are not final. | 
| sigs | struct IForceMove.Signature[] | An array of signatures that support the state with the `largestTurnNum`. | 
| whoSignedWhat | uint8[] | An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`. | 
| challengerSig | struct IForceMove.Signature | The signature of a participant on the keccak256 of the abi.encode of (supportedStateHash, 'forceMove'). | 

### respond

Repsonds to an ongoing challenge registered against a state channel.

```solidity
function respond(address challenger, bool[2] isFinalAB, struct IForceMove.FixedPart fixedPart, struct ForceMoveApp.VariablePart[2] variablePartAB, struct IForceMove.Signature sig) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| challenger | address | The address of the participant whom registered the challenge. | 
| isFinalAB | bool[2] | An pair of booleans describing if the challenge state and/or the response state have the `isFinal` property set to `true`. | 
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| variablePartAB | struct ForceMoveApp.VariablePart[2] | An pair of structs, each decribing the properties of the state channel that may change with each state update (for the challenge state and for the response state). | 
| sig | struct IForceMove.Signature | The responder's signature on the `responseStateHash`. | 

### checkpoint

Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.

```solidity
function checkpoint(struct IForceMove.FixedPart fixedPart, uint48 largestTurnNum, struct ForceMoveApp.VariablePart[] variableParts, uint8 isFinalCount, struct IForceMove.Signature[] sigs, uint8[] whoSignedWhat) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| largestTurnNum | uint48 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| variableParts | struct ForceMoveApp.VariablePart[] | An ordered array of structs, each decribing the properties of the state channel that may change with each state update. | 
| isFinalCount | uint8 | Describes how many of the submitted states have the `isFinal` property set to `true`. It is implied that the rightmost `isFinalCount` states are final, and the rest are not final. | 
| sigs | struct IForceMove.Signature[] | An array of signatures that support the state with the `largestTurnNum`. | 
| whoSignedWhat | uint8[] | An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`. | 

### conclude

Finalizes a channel by providing a finalization proof.

```solidity
function conclude(uint48 largestTurnNum, struct IForceMove.FixedPart fixedPart, bytes32 appPartHash, bytes32 outcomeHash, uint8 numStates, uint8[] whoSignedWhat, struct IForceMove.Signature[] sigs) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| largestTurnNum | uint48 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| appPartHash | bytes32 | The keccak256 of the abi.encode of `(challengeDuration, appDefinition, appData)`. Applies to all states in the finalization proof. | 
| outcomeHash | bytes32 | The keccak256 of the abi.encode of the `outcome`. Applies to all stats in the finalization proof. | 
| numStates | uint8 | The number of states in the finalization proof. | 
| whoSignedWhat | uint8[] | An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`. | 
| sigs | struct IForceMove.Signature[] | An array of signatures that support the state with the `largestTurnNum`. | 

