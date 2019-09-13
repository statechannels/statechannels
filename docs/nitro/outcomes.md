---
id: outcomes
title: Outcomes
---

ForceMove specifies that a state should have a `currentOutcome` but doesn't say anything
about the format, simply treating it as an unstructured `bytes` field.
In this section we look at the outcome formats needed for Nitro.

## Spec

Nitro supports multiple different assets (e.g. ETH and one or more ERC20s) being held in the same channel.

An outcome is a set of **asset outcomes**.

```
Outcome = AssetOutcome[]
AssetOutome = (AssetID, AllocationOrGuarantee)
AllocationOrGuarantee = Allocation | Guarantee
Allocation = AllocationItem[]
AllocationItem = (Destination, Amount)
Guarantee = (ChannelAddress, Destination[])
Destination = ChannelAddress | ExternalAddress
```

Destinations are

An allocation determines

## Implementation

Nitro Adjudicator extends OptimizedForceMove
Adds a `pushOutcome`

One adjudicator pushing to multiple asset holders.

### Formats

| **Field**             | **Data type**          | **Definition / Explanation**                                                                                                                                  |
| :-------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Outcome               | `bytes`                | Abi-encoded array of AssetOutcomes                                                                                                                            |
| AssetOutcome          | `(address, bytes)`     | `(assetHolderAddress, data)`, where the asset holder is the contract which holds the given type of asset, and `data` is the abi-encoded AllocationOrGuarantee |
| AllocationOrGuarantee | `(uint8, bytes)`       | `(type, data)`, where `type` is 0 for allocations and 1 for guarantees, and `data` field is the abi-encoded form of the Allocation or Guarantee               |
| Allocation            | `(bytes32, uint256)[]` | An list of AllocationItems, in payout priority order (highest priority first)                                                                                 |
| AllocationItem        | `(bytes32, uint256)`   | `(destination, amount)`                                                                                                                                       |
| Guarantee             | `(bytes32, bytes32[])` | `(targetChannelId, destinations)`                                                                                                                             |
| ChannelAddress        | `bytes32`              | Equal to the ChannelId defined in ForceMove                                                                                                                   |
| ExternalAddress       | `bytes32`              | An Ethereum address right padded with 12 bytes of zeros                                                                                                       |
| Destination           | `bytes32`              | Taken to be an ExternalAddress if starts with 12 bytes of leading zeros and a ChannelAddress otherwise                                                        |
