---
id: deposit
title: deposit
sidebar_label: deposit
---

The deposit method allows ETH or ERC20 tokens to be escrowed against a channel.

Call signature:

```solidity
function deposit(bytes32 destination, uint256 expectedHeld, uint256 amount) public payable
```

## Checks:

- `destination` must be an external address
- The holdings for `destination` must be greater than or equal to `expectedHeld`.
- The holdings for `destination` must be less than the sum of the amount expected to be held and the amount declared in the deposit.

### ETHAssetHolder checks

The transaction must be accompanied by exactly `amount` wei.

### ERC20AssetHolder checks

The ERC20AssetHolder has a Token contract addressed baked in at deploy-time.

This contract must be able to successfully call `transferFrom` on that ERC20 Token contract, with the Token account being `msg.sender` with a sufficient number of tokens specified.

## Effects

Increase holdings for `destination` to the sum of the amount expected to be held and the amount declared in the deposit.

Emit a `Deposited` event with `indexed` parameter `destination`.

:::warning
You may only deposit to a channel address. This is currently enforced at the contract level, but this may change in future. Do not attempt to deposit into external addresses.
:::

:::caution
Depositing ahead of those with higher precedence is not safe (they can steal your funds). Always ensure that the channel is funded up to and including all players with higher precedence, before making a deposit.
:::
