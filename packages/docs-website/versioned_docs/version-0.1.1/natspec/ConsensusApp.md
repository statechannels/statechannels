---
id: ConsensusApp
title: ConsensusApp.sol
---

View Source: [contracts/ConsensusApp.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/ConsensusApp.sol)

**↗ Extends: [ForceMoveApp](ForceMoveApp.md)**

The ConsensusApp complies with the ForceMoveApp interface and allows a channel outcome to be updated if and only if all participants are in agreement.

---

## Structs
### ConsensusAppData

```solidity
struct ConsensusAppData {
 uint32 furtherVotesRequired,
 bytes proposedOutcome
}
```

## Functions

- [appData](#appdata)
- [validTransition](#validtransition)
- [identical](#identical)

---

### appData

Deocdes the appData.

```solidity
function appData(bytes appDataBytes) internal pure
returns(struct ConsensusApp.ConsensusAppData)
```

**Returns**

A ConsensusAppData struct containing the application-specific data.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| appDataBytes | bytes | The abi.encode of a ConsensusAppData struct describing the application-specific data. | 

### validTransition

Encodes the ConsensusApp rules.

```solidity
function validTransition(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, uint48 , uint256 nParticipants) public pure
returns(bool)
```

**Returns**

true if the transition conforms to the ConsensusApp's rules, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart | State being transitioned from. | 
| b | struct ForceMoveApp.VariablePart | State being transitioned to. | 
|  | uint48 | a State being transitioned from. | 
| nParticipants | uint256 | Number of participants in this state channel. | 

### identical

Check for equality of two byte strings

```solidity
function identical(bytes a, bytes b) internal pure
returns(bool)
```

**Returns**

true if the bytes are identical, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | bytes | One bytes string | 
| b | bytes | The other bytes string | 

