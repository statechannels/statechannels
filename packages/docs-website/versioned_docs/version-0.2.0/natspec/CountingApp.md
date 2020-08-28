---
id: CountingApp
title: CountingApp.sol
original_id: CountingApp
---

View Source: [contracts/CountingApp.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/CountingApp.sol)

**↗ Extends: [ForceMoveApp](ForceMoveApp.md)**

The CountingApp contracts complies with the ForceMoveApp interface and allows only for a simple counter to be incremented. Used for testing purposes.

---

## Structs
### CountingAppData

```solidity
struct CountingAppData {
 uint256 counter
}
```

## Functions

- [appData](#appdata)
- [validTransition](#validtransition)

---

### appData

Decodes the appData.

```solidity
function appData(bytes appDataBytes) internal pure
returns(struct CountingApp.CountingAppData)
```

**Returns**

A CountingAppDatat struct containing the application-specific data.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| appDataBytes | bytes | The abi.encode of a CountingAppData struct describing the application-specific data. | 

### validTransition

Encodes the CountingApp rules.

```solidity
function validTransition(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, uint48 , uint256 ) public pure
returns(bool)
```

**Returns**

true if the transition conforms to the rules, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart | State being transitioned from. | 
| b | struct ForceMoveApp.VariablePart | State being transitioned to. | 
|  | uint48 | a State being transitioned from. | 
|  | uint256 | a State being transitioned from. | 

