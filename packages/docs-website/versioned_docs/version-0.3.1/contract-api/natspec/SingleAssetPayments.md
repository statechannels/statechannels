---
id: SingleAssetPayments
title: SingleAssetPayments.sol
original_id: SingleAssetPayments
---

View Source: [contracts/examples/SingleAssetPayments.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/examples/SingleAssetPayments.sol)

**↗ Extends: [ForceMoveApp](ForceMoveApp.md)**

The SingleAssetPayments contract complies with the ForceMoveApp interface and implements a simple payment channel with a single asset type only.

---

## Functions

- [validTransition](#validtransition)

---

### validTransition

Encodes the payment channel update rules.

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

