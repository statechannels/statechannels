---
id: version-0.1.1-ERC20AssetHolder
title: ERC20AssetHolder.sol
original_id: ERC20AssetHolder
---

View Source: [contracts/ERC20AssetHolder.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/ERC20AssetHolder.sol)

**↗ Extends: [AssetHolder](AssetHolder.md)**
**↘ Derived Contracts: [TestErc20AssetHolder](TestErc20AssetHolder.md)**

Ther ERC20AssetHolder contract extends the AssetHolder contract, and adds the following functionality: it allows ERC20 tokens to be escrowed against a state channelId and to be transferred to external destinations.

---

## Contract Members
**Constants & Variables**

```solidity
contract IERC20 internal Token;

```

## Functions

- [](#)
- [deposit](#deposit)
- [_transferAsset](#_transferasset)

---

### 

Constructor function storing the AdjudicatorAddress and instantiating an interface to an ERC20 Token contract.

```solidity
function (address _AdjudicatorAddress, address _TokenAddress) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _AdjudicatorAddress | address | Address of an Adjudicator  contract, supplied at deploy-time. | 
| _TokenAddress | address | Address of an ERC20 Token  contract, supplied at deploy-time. | 

### deposit

Deposit ERC20 tokens against a given destination.

```solidity
function deposit(bytes32 destination, uint256 expectedHeld, uint256 amount) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| destination | bytes32 | ChannelId to be credited. | 
| expectedHeld | uint256 | The amount of tokens that the depositor believes are _already_ escrowed against the channelId. | 
| amount | uint256 | The intended number of tokens to be deposited. | 

### _transferAsset

Transfers the given amount of ERC20 tokens to a supplied ethereum address.

```solidity
function _transferAsset(address payable destination, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| destination | address payable | Ethereum address to be credited. | 
| amount | uint256 | Quantity of tokens to be transferred. | 

