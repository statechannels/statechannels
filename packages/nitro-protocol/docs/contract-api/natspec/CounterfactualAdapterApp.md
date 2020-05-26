---
id: CounterfactualAdapterApp
title: CounterfactualAdapterApp.sol
---

View Source: [contracts/CounterfactualAdapterApp.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/CounterfactualAdapterApp.sol)

**↗ Extends: [ForceMoveApp](ForceMoveApp.md)**

---

## Structs
### CounterfactualAdapterAppData

```solidity
struct CounterfactualAdapterAppData {
 address cfAppDefinition,
 bytes cfAppData,
 bytes cfActionTaken
}
```

## Functions

- [appData](#appdata)
- [validTransition](#validtransition)

---

### appData

```solidity
function appData(bytes appDataBytes) internal pure
returns(struct CounterfactualAdapterApp.CounterfactualAdapterAppData)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| appDataBytes | bytes |  | 

### validTransition

```solidity
function validTransition(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, uint256 , uint256 ) public pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct ForceMoveApp.VariablePart |  | 
| b | struct ForceMoveApp.VariablePart |  | 
|  | uint256 |  | 
|  | uint256 |  | 

