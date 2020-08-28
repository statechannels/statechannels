---
id: Outcome
title: Outcome.sol
original_id: Outcome
---

View Source: [contracts/Outcome.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/Outcome.sol)

---

## **Enums**
### AssetOutcomeType

```solidity
enum AssetOutcomeType {
 Allocation,
 Guarantee
}
```

## Structs
### OutcomeItem

```solidity
struct OutcomeItem {
 address assetHolderAddress,
 bytes assetOutcomeBytes
}
```

### AssetOutcome

```solidity
struct AssetOutcome {
 uint8 assetOutcomeType,
 bytes allocationOrGuaranteeBytes
}
```

### AllocationItem

```solidity
struct AllocationItem {
 bytes32 destination,
 uint256 amount
}
```

### Guarantee

```solidity
struct Guarantee {
 bytes32 targetChannelId,
 bytes32[] destinations
}
```

## Functions

---

