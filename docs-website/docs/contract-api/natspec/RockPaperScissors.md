---
id: RockPaperScissors
title: RockPaperScissors.sol
---

View Source: [contracts/examples/RockPaperScissors.sol](contracts/examples/RockPaperScissors.sol)

**↗ Extends: [ForceMoveApp](ForceMoveApp.md)**

The RockPaperScissors contract complies with the ForceMoveApp interface and implements a commit-reveal game of Rock Paper Scissors (henceforth RPS).
The following transitions are allowed:
  * Start -> RoundProposed  [ PROPOSE ]
RoundProposed -> Start  [ REJECT ]
RoundProposed -> RoundAccepted [ ACCEPT ]
RoundAccepted -> Reveal [ REVEAL ]
Reveal -> Start [ FINISH ]

---

## **Enums**
### PositionType

```solidity
enum PositionType {
 Start,
 RoundProposed,
 RoundAccepted,
 Reveal
}
```

### Weapon

```solidity
enum Weapon {
 Rock,
 Paper,
 Scissors
}
```

## Structs
### RPSData

```solidity
struct RPSData {
 enum RockPaperScissors.PositionType positionType,
 uint256 stake,
 bytes32 preCommit,
 enum RockPaperScissors.Weapon bWeapon,
 enum RockPaperScissors.Weapon aWeapon,
 bytes32 salt
}
```

## Modifiers

- [outcomeUnchanged](#outcomeunchanged)
- [stakeUnchanged](#stakeunchanged)
- [allocationsNotLessThanStake](#allocationsnotlessthanstake)

### outcomeUnchanged

```solidity
modifier outcomeUnchanged(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b) internal
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart |  | 
| b | struct ForceMoveApp.VariablePart |  | 

### stakeUnchanged

```solidity
modifier stakeUnchanged(struct RockPaperScissors.RPSData appDataA, struct RockPaperScissors.RPSData appDataB) internal
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| appDataA | struct RockPaperScissors.RPSData |  | 
| appDataB | struct RockPaperScissors.RPSData |  | 

### allocationsNotLessThanStake

```solidity
modifier allocationsNotLessThanStake(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, struct RockPaperScissors.RPSData appDataA, struct RockPaperScissors.RPSData appDataB) internal
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart |  | 
| b | struct ForceMoveApp.VariablePart |  | 
| appDataA | struct RockPaperScissors.RPSData |  | 
| appDataB | struct RockPaperScissors.RPSData |  | 

## Functions

- [appData](#appdata)
- [validTransition](#validtransition)
- [requireValidPROPOSE](#requirevalidpropose)
- [requireValidREJECT](#requirevalidreject)
- [requireValidACCEPT](#requirevalidaccept)
- [requireValidFINISH](#requirevalidfinish)

---

### appData

Deocdes the appData.

```solidity
function appData(bytes appDataBytes) internal pure
returns(struct RockPaperScissors.RPSData)
```

**Returns**

An RPSData struct containing the application-specific data.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| appDataBytes | bytes | The abi.encode of a RPSData struct describing the application-specific data. | 

### validTransition

⤾ overrides [ForceMoveApp.validTransition](ForceMoveApp.md#validtransition)

Encodes the RPS update rules.

```solidity
function validTransition(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, uint256 turnNumB, uint256 nParticipants) public pure
returns(bool)
```

**Returns**

true if the transition conforms to the rules, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart | State being transitioned from. | 
| b | struct ForceMoveApp.VariablePart | State being transitioned to. | 
| turnNumB | uint256 | Turn number being transitioned to. | 
| nParticipants | uint256 | Number of participants in this state channel. | 

### requireValidPROPOSE

```solidity
function requireValidPROPOSE(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, struct RockPaperScissors.RPSData appDataA, struct RockPaperScissors.RPSData appDataB) private pure outcomeUnchanged stakeUnchanged allocationsNotLessThanStake 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart |  | 
| b | struct ForceMoveApp.VariablePart |  | 
| appDataA | struct RockPaperScissors.RPSData |  | 
| appDataB | struct RockPaperScissors.RPSData |  | 

### requireValidREJECT

```solidity
function requireValidREJECT(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, struct RockPaperScissors.RPSData appDataA, struct RockPaperScissors.RPSData appDataB) private pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart |  | 
| b | struct ForceMoveApp.VariablePart |  | 
| appDataA | struct RockPaperScissors.RPSData |  | 
| appDataB | struct RockPaperScissors.RPSData |  | 

### requireValidACCEPT

```solidity
function requireValidACCEPT(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, struct RockPaperScissors.RPSData appDataA, struct RockPaperScissors.RPSData appDataB) private pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart |  | 
| b | struct ForceMoveApp.VariablePart |  | 
| appDataA | struct RockPaperScissors.RPSData |  | 
| appDataB | struct RockPaperScissors.RPSData |  | 

### requireValidFINISH

```solidity
function requireValidFINISH(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, struct RockPaperScissors.RPSData appDataA, struct RockPaperScissors.RPSData appDataB) private pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart |  | 
| b | struct ForceMoveApp.VariablePart |  | 
| appDataA | struct RockPaperScissors.RPSData |  | 
| appDataB | struct RockPaperScissors.RPSData |  | 

