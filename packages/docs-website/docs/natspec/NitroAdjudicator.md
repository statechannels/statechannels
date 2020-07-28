---
id: NitroAdjudicator
title: NitroAdjudicator.sol
---

View Source: [contracts/NitroAdjudicator.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/NitroAdjudicator.sol)

**↗ Extends: [Adjudicator](Adjudicator.md), [ForceMove](ForceMove.md)**
**↘ Derived Contracts: [TESTNitroAdjudicator](TESTNitroAdjudicator.md)**

The NitroAdjudicator contract extends ForceMove and hence inherits all ForceMove methods, and also extends and implements the Adjudicator interface, allowing for a finalized outcome to be pushed to an asset holder.

---

## Functions

- [pushOutcome](#pushoutcome)
- [pushOutcomeAndTransferAll](#pushoutcomeandtransferall)
- [concludePushOutcomeAndTransferAll](#concludepushoutcomeandtransferall)
- [_transferAllFromAllAssetHolders](#_transferallfromallassetholders)
- [validTransition](#validtransition)

---

### pushOutcome

Allows a finalized channel's outcome to be decoded and one or more AssetOutcomes registered in external Asset Holder contracts.

```solidity
function pushOutcome(bytes32 channelId, uint48 turnNumRecord, uint48 finalizesAt, bytes32 stateHash, address challengerAddress, bytes outcomeBytes) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel | 
| turnNumRecord | uint48 | A turnNum that (the adjudicator knows and stores) is supported by a signature from each participant. | 
| finalizesAt | uint48 | The unix timestamp when this channel will finalize | 
| stateHash | bytes32 | The keccak256 of the abi.encode of the State (struct) stored by the adjudicator | 
| challengerAddress | address | The address of the participant whom registered the challenge, if any. | 
| outcomeBytes | bytes | The encoded Outcome of this state channel. | 

### pushOutcomeAndTransferAll

Allows a finalized channel's outcome to be decoded and transferAll to be triggered in external Asset Holder contracts.

```solidity
function pushOutcomeAndTransferAll(bytes32 channelId, uint48 turnNumRecord, uint48 finalizesAt, bytes32 stateHash, address challengerAddress, bytes outcomeBytes) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel | 
| turnNumRecord | uint48 | A turnNum that (the adjudicator knows and stores) is supported by a signature from each participant. | 
| finalizesAt | uint48 | The unix timestamp when this channel will finalize | 
| stateHash | bytes32 | The keccak256 of the abi.encode of the State (struct) stored by the adjudicator | 
| challengerAddress | address | The address of the participant whom registered the challenge, if any. | 
| outcomeBytes | bytes | The encoded Outcome of this state channel. | 

### concludePushOutcomeAndTransferAll

Finalizes a channel by providing a finalization proof, allows a finalized channel's outcome to be decoded and transferAll to be triggered in external Asset Holder contracts.

```solidity
function concludePushOutcomeAndTransferAll(uint48 largestTurnNum, struct IForceMove.FixedPart fixedPart, bytes32 appPartHash, bytes outcomeBytes, uint8 numStates, uint8[] whoSignedWhat, struct IForceMove.Signature[] sigs) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| largestTurnNum | uint48 | The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`. | 
| fixedPart | struct IForceMove.FixedPart | Data describing properties of the state channel that do not change with state updates. | 
| appPartHash | bytes32 | The keccak256 of the abi.encode of `(challengeDuration, appDefinition, appData)`. Applies to all states in the finalization proof. | 
| outcomeBytes | bytes | abi.encode of an array of Outcome.OutcomeItem structs. | 
| numStates | uint8 | The number of states in the finalization proof. | 
| whoSignedWhat | uint8[] | An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`. | 
| sigs | struct IForceMove.Signature[] | An array of signatures that support the state with the `largestTurnNum`. | 

### _transferAllFromAllAssetHolders

Triggers transferAll in all external Asset Holder contracts specified in a given outcome for a given channelId.

```solidity
function _transferAllFromAllAssetHolders(bytes32 channelId, bytes outcomeBytes) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel | 
| outcomeBytes | bytes | abi.encode of an array of Outcome.OutcomeItem structs. | 

### validTransition

Check that the submitted pair of states form a valid transition (public wrapper for internal function _requireValidTransition)

```solidity
function validTransition(uint256 nParticipants, bool[2] isFinalAB, struct ForceMoveApp.VariablePart[2] ab, uint48 turnNumB, address appDefinition) public pure
returns(bool)
```

**Returns**

true if the later state is a validTransition from its predecessor, reverts otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| nParticipants | uint256 | Number of participants in the channel.
transition | 
| isFinalAB | bool[2] | Pair of booleans denoting whether the first and second state (resp.) are final. | 
| ab | struct ForceMoveApp.VariablePart[2] | Variable parts of each of the pair of states | 
| turnNumB | uint48 | turnNum of the later state of the pair. | 
| appDefinition | address | Address of deployed contract containing application-specific validTransition function. | 

