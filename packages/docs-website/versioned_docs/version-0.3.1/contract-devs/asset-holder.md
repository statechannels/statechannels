---
id: asset-holder
title: AssetHolder.sol
original_id: asset-holder
---

The asset-holder contracts describe how ETH and/or tokens are held on-chain for any given channel, and how to interpret the channel outcomes in order to determine and execute any payouts that are due.

AssetHolder.sol is a base contract that it is not actually deployed. It is inherited by (for example) ETHAssetHolder.sol and ERC20AssetHolder.sol (which are deployed).

In Nitro a payout is of one of two types: it is either a payout to a channel participant or it is a payout to another channel. It is this second type of payout that allows channels to fund one another in Nitro, enabling the virtual channels that are used to build state channel networks.

Nitro is implemented in `AssetHolder.sol`, which conforms to the [`IAssetHolder`](../contract-api/natspec/IAssetHolder) interface and

1. Interprets final outcomes supplied by adjudicator contracts
2. Allows escrowed assets to be transferred from channels to their beneficiaries

This contract is only used as a base contract, and is extended by `ETHAssetHolder.sol` and `ERC20AssetHolder.sol` which additionally:

3. Stipulate how assets are deposited and paid out to external destinations.

---

## Outcomes

ForceMove specifies that a state should have a default `outcome` but does not specify the format of that `outcome`, and simply treats it as an unstructured `bytes` field. In this section we look at the outcome formats needed for Nitro.

Nitro supports multiple different assets (e.g. ETH and one or more ERC20s) being held in the same channel.

The outcome is stored in two places: first, as a single hash in the adjudicator contract; second, in multiple hashes across multiple asset holder contracts.

The adjudicator stores (the hash of) an encoded `outcome` for each finalized channel. As a part of the process triggered by [`pushOutcome`](./nitro-adjudicator#pushoutcome), a decoded outcome will be stored across multiple asset holder contracts in a number of hashes. A decoded `outcome` is an array of `OutcomeItems`. These individual `OutcomeItems` contain a pointer to the asset holder contract in question, as well as some `bytes` that encode a `AssetOutcome`. The `AssetOutcomes` are each stored (abi encoded and hashed) by the asset holder contract specified. This data structure contains some more `bytes` encoding either an allocation or a guarantee, as well as the `AssetOutcomeType`: an integer which indicates which.

In `Outcome.sol`:

```solidity
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

library Outcome {
  // An outcome is an array of OutcomeItems
  // Outcome = OutcomeItem[]
  // OutcomeItem = (AssetHolderAddress, AssetOutcome)
  // AssetOutcome = (AssetOutcomeType, Allocation | Guarantee)
  // Allocation = AllocationItem[]
  // AllocationItem = (Destination, Amount)
  // Guarantee = (ChannelId, Destination[])
  // Destination = ChannelId | ExternalDestination

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

### Example

| >                                                                                               | 0xETHAssetHolder                                 | 0                                                                                                     | 0xDestA     | 5      | 0xDestB     | 2      | 0xDAIAssetHolder | ... |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------- | ------ | ----------- | ------ | ---------------- | --- |
|                                                                                                 |                                                  |                                                                                                       | Destination | Amount | Destination | Amount |                  |     |
|                                                                                                 |                                                  | <td colspan="2" align="center">AllocationItem</td> <td colspan="2" align="center">AllocationItem</td> |             |        |
|                                                                                                 |                                                  | <td colspan="4" align="center">Allocation</td>                                                        |             |        |
|                                                                                                 | <td colspan="5" align="center">AssetOutcome</td> |                                                                                                       |             |
| <td colspan="6" align="center">OutcomeItem</td> <td colspan="6" align="center">OutcomeItem</td> |
| <td colspan="8" align="center">Outcome</td>                                                     |

### Destinations

A `Destination` is a `bytes32` and either:

1. A `ChannelId` (see the section on [channelId](./force-move#channelid)), or
2. An `ExternalDestination`, which is an ethereum address left-padded with zeros.

:::tip
In JavaScript, the `ExternalDestination` corresponding to `address` may be computed as

```
'0x' + address.padStart(64, '0')
```

:::

---

## Storage

An AssetHolder will store the following information:

```solidity
address AdjudicatorAddress; // used to apply permissions to certain methods

mapping(bytes32 => uint256) public holdings; // assets stored against channelIds

mapping(bytes32 => bytes32) public assetOutcomeHashes; // asset outcomes stored against channelIds

```

## `deposit`

The deposit method allows ETH or ERC20 tokens to be escrowed against a channel.

Call signature:

```solidity
function deposit(bytes32 destination, uint256 expectedHeld, uint256 amount) public payable
```

Checks:

- `destination` must NOT be an [external destination](#destinations).
- The holdings for `destination` must be greater than or equal to `expectedHeld`.
- The holdings for `destination` must be less than the sum of the amount expected to be held and the amount declared in the deposit.

### `ETHAssetHolder` checks

The transaction must be accompanied by exactly `amount` wei.

### `ERC20AssetHolder` checks

`ERC20AssetHolder.sol` includes an interface to a particular ERC20 Token with an address baked in at deploy-time.

This contract must be able to successfully call `transferFrom` on that ERC20 Token contract, with the Token account being `msg.sender` with a sufficient number of tokens specified.

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

Effects:

Increase holdings for `destination` to the sum of the amount expected to be held and the amount declared in the deposit.

Emit a `Deposited` event with `indexed` parameter `destination`.

:::warning
You may only deposit to a channel address. This is currently enforced at the contract level, but this may change in future. Do not attempt to deposit into external destinations.
:::

:::caution
Depositing ahead of those with higher precedence is not safe (they can steal your funds). Always ensure that the channel is funded up to and including all players with higher precedence, before making a deposit.
:::

## `setAssetOutcomeHash`

The `setAssetOutcomeHash` method allows an outcome (more strictly, an `outcomeHash`) to be registered against a channel.

```solidity
    function setAssetOutcomeHash(bytes32 channelId, bytes32 assetOutcomeHash)
        external
        AdjudicatorOnly
        returns (bool success)
```

It may only be called by the Nitro Adjudicator.

### Permissions

The following function modifier restricts permission to a certain Adjudicator.

```solidity
    modifier AdjudicatorOnly {
        require(msg.sender == AdjudicatorAddress, 'Only the NitroAdjudicator is authorized');
        _;
    }
```

Checks:

- A single adjudicator address is baked into this contract at deploy-time
- Is `msg.sender` equal to this address?

Effects:

- store `assetOutcomeHash` against `channelId`.

---

## `transferAll`

The transferAll method takes the funds escrowed against a channel, and attempts to transfer them to the beneficiaries of that channel. The transfers are attempted in priority order, so that beneficiaries of underfunded channels may not receive a transfer, depending on their priority. Surplus funds remain in escrow against the channel. Full or partial transfers to a beneficiary results in deletion or reduction of that beneficiary's allocation (respectively). A transfer to another channel results in explicit escrow of funds against that channel. A transfer to an external destination results in ETH or ERC20 tokens being transferred out of the AssetHolder contract.

```solidity
function transferAll(bytes32 channelId, bytes calldata allocationBytes) external
```

This algorithm works by counting the number of `AllocationItems` that are to be completely converted into payouts. The remaining `AllocationItems` will be stored in a new `Allocation` and the storage mapping updated. There can be at most a single item that is a partial payout -- in this case the appropriately modified `AllocationItem` is also preserved. This is called the 'overlap' case.

---

## `claimAll`

The claimAll method takes the funds escrowed against a guarantor channel, and attempts to transfer them to the beneficiaries of the target channel specified by the guarantor. The transfers are first attempted in a nonstandard priority order given by the guarantor, so that beneficiaries of underfunded channels may not receive a transfer, depending on their nonstandard priority. Full or partial transfers to a beneficiary results in deletion or reduction of that beneficiary's allocation (respectively). Surplus funds are then subject to another attempt to transfer them to the beneficiaries of the target channel, but this time with the standard priority order given by the target channel. Any funds that still remain after this step remain in escrow against the guarantor.

As with `transferAll`, a transfer to another channel results in explicit escrow of funds against that channel. A transfer to an external destination results in ETH or ERC20 tokens being transferred out of the AssetHolder contract.

```solidity
   function claimAll(
        bytes32 channelId,
        bytes calldata guaranteeBytes,
        bytes calldata allocationBytes
    ) external
```

In comparison to `transferAll`, in `claimAll` it is more difficult to track the unknown number of payouts and new `AllocationItems`. An array of payouts is initialized with the same length as the target channel's allocation. While the balance is positive, and for each destination in the guarantee, find the first occurrence of that destination in the target channel's allocation. If there is sufficient balance remaining, increase the payout and decrease the number of new allocation items. If there is insufficient balance remaining, assign all of it to a payout (and the balance becomes zero), decrease the amount in the allocation item, and do not decrease the number of new allocation items. With the remaining balance (if any) continue thus: While the balance remains positive, and for each item in the target channel's allocation, if there is sufficient balance remaining, increase the payout and decrease the number of new allocation items. If there is insufficient balance remaining, assign all of it to a payout (and the balance becomes zero), decrease the amount in the allocation item, and do not decrease the number of new allocation items.

Finally, update the holdings, compute the new allocation and update the storage, and execute the payouts.

---

## `_transferAsset`

This internal method executes transfers of assets external to the Nitro network.

```solidity
function _transferAsset(address payable destination, uint256 amount) internal {}
```

The behavior is slightly different depending on the asset that has been escrowed:

### `ETHAssetHolder` transfer

Executes an ethereum `transfer` of `amount` to `destination`.

### `ERC20AssetHolder` transfer

Calls `transfer(destination,amount)` on the specified Token contract.
