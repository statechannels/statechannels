---
id: TrivialApp
title: TrivialApp.sol
---

View Source: [contracts/TrivialApp.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/TrivialApp.sol)

**↗ Extends: [ForceMoveApp](ForceMoveApp.md)**

The Trivialp contracts complies with the ForceMoveApp interface and allows all transitions, regardless of the data. Used for testing purposes.

---

## Functions

- [validTransition](#validtransition)

---

### validTransition

Encodes trivial rules.

```solidity
function validTransition(struct ForceMoveApp.VariablePart , struct ForceMoveApp.VariablePart , uint256 , uint256 ) public pure
returns(bool)
```

**Returns**

true.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
|  | struct ForceMoveApp.VariablePart |  | 
|  | struct ForceMoveApp.VariablePart |  | 
|  | uint256 |  | 
|  | uint256 |  | 

