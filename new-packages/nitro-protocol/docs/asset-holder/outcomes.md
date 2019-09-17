---
id: outcomes
title: Outcomes
---

ForceMove specifies that a state should have a default `outcome` but does not specify the format of that `outcome`, and simply treats it as an unstructured `bytes` field. In this section we look at the outcome formats needed for Nitro.

## Specification

Nitro supports multiple different assets (e.g. ETH and one or more ERC20s) being held in the same channel.

The outcome is stored in two places: first, as a single hash in the adjudicator contract; second, in multiple hashes across multiple asset holder contracts.

The adjudicator stores (the hash of) an encoded `outcome` for each finalized channel. As a part of the process triggered by [`pushOutcome`](./adjudicator/push-outcome), a decoded outcome will be stored across multiple asset holder contracts in a number of hashes. A decoded `outcome` is an array of `OutcomeItems`. These individual `OutcomeItems` contain a pointer to the asset holder contract in question, as well as some `bytes` that encode a `AssetOutcome`. The `AssetOutcomes` are each stored (abi encoded and hashed) by the asset holder contract specified. This data structure contains some more `bytes` encoding either an allocation or a guarantee, as well as the `AssetOutcomeType`: an integer which indicates which.

## Implementation

In `Outcome2.sol`:

```solidity
pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

library Outcome {
  //An outcome is an array of OutcomeItems
  // Outcome = OutcomeItem[]
  // OutcomeItem = (AssetHolderAddress, AssetOutcome)
  // AssetOutcome = (AssetOutcomeType, Allocation | Guarantee)
  // Allocation = AllocationItem[]
  // AllocationItem = (Destination, Amount)
  // Guarantee = (ChannelAddress, Destination[])
  // Destination = ChannelAddress | ExternalAddress

  struct OutcomeItem {
    address assetHolderAddress;
    bytes assetOutcomeBytes; // abi.encode(AssetOutcome)
  }

  enum AssetOutcomeType {Allocation, Guarantee}

  struct AssetOutcome {
    uint8 assetOutcomeType; // AssetOutcomeType.Allocation or AssetOutcomeType.Guarantee
    bytes allocationOrGuaranteeBytes; // abi.encode(AllocationItem[]) or abi.encode(Guarantee), depending on OutcomeType
  }

  // reserve Allocation to refer to AllocationItem[]
  struct AllocationItem {
    bytes32 destination;
    uint256 amount;
  }

  struct Guarantee {
    bytes32 targetChannelId;
    bytes32[] destinations;
  }

}
```

:::warning
TODO migrate codebase to Outcome2.sol
:::

## Example of an outcome data structure

| >                                                                                               | 0xETHAssetHolder                                 | 0                                                  | 0xAlice | 5   | 0xBob | 2   | 0xDAIAssetHolder | ... |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- | ------- | --- | ----- | --- | ---------------- | --- |
|                                                                                                 |                                                  | <td colspan="4" align="center">AllocationItem</td> |         |     |
|                                                                                                 | <td colspan="5" align="center">AssetOutcome</td> |                                                    |         |
| <td colspan="6" align="center">OutcomeItem</td> <td colspan="6" align="center">OutcomeItem</td> |
| <td colspan="8" align="center">Outcome</td>                                                     |

## Storage

An AssetHolder will store the following information:

```solidity
address AdjudicatorAddress; // used to apply permissions to certain methods

mapping(bytes32 => uint256) public holdings; // assets stored against channelIds

mapping(bytes32 => bytes32) public assetOutcomeHashes; // asset outcomes stored against channelIds

```

An ERC20AssetHolder additionally stores an interface to a particular ERC20 Token:

```solidity
// ...
  IERC20 Token;
//...
}

contract IERC20 {
    // Abstraction of the parts of the ERC20 Interface that we need
    function transfer(address to, uint256 tokens) public returns (bool success);
    function transferFrom(address from, address to, uint256 tokens) public returns (bool success);
}

```

## Permissions

The following function modifier must be defined:

```solidity
    modifier AdjudicatorOnly {
        require(msg.sender == AdjudicatorAddress, 'Only the NitroAdjudicator is authorized');
        _;
    }
```
