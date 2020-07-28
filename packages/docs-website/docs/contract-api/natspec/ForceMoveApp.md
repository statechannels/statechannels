---
id: ForceMoveApp
title: ForceMoveApp.sol
---

View Source: [contracts/interfaces/ForceMoveApp.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/interfaces/ForceMoveApp.sol)

**↘ Derived Contracts: [ConsensusApp](ConsensusApp.md), [CountingApp](CountingApp.md), [SingleAssetPayments](SingleAssetPayments.md), [TrivialApp](TrivialApp.md)**

The ForceMoveApp interface calls for its children to implement an application-specific validTransition function, defining the state machine of a ForceMove state channel DApp.

---

## Structs
### VariablePart

```solidity
struct VariablePart {
 bytes outcome,
 bytes appData
}
```

## Functions

- [validTransition](#validtransition)

---

### validTransition

Encodes application-specific rules for a particular ForceMove-compliant state channel.

```solidity
function validTransition(struct ForceMoveApp.VariablePart a, struct ForceMoveApp.VariablePart b, uint256 turnNumB, uint256 nParticipants) external pure
returns(bool)
```

**Returns**

true if the transition conforms to this application's rules, false otherwise

**Arguments**

| Name          | Type                             | Description                                   |
|---------------|----------------------------------|-----------------------------------------------|
| a             | struct ForceMoveApp.VariablePart | State being transitioned from.                |
| b             | struct ForceMoveApp.VariablePart | State being transitioned to.                  |
| turnNumB      | uint256                          | Turn number being transitioned to.            |
| nParticipants | uint256                          | Number of participants in this state channel. |

