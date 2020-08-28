---
id: ETHAssetHolder
title: ETHAssetHolder.sol
original_id: ETHAssetHolder
---

View Source: [contracts/ETHAssetHolder.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/ETHAssetHolder.sol)

**↗ Extends: [AssetHolder](AssetHolder.md)**
**↘ Derived Contracts: [TestEthAssetHolder](TestEthAssetHolder.md)**

Ther ETHAssetHolder contract extends the AssetHolder contract, and adds the following functionality: it allows ETH to be escrowed against a state channelId and to be transferred to external destinations.

---

## Functions

- [](#)
- [deposit](#deposit)
- [_transferAsset](#_transferasset)

---

### 

Constructor function storing the AdjudicatorAddress.

```solidity
function (address _AdjudicatorAddress) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _AdjudicatorAddress | address | Address of an Adjudicator  contract, supplied at deploy-time. | 

### deposit

Deposit ETH against a given destination.

```solidity
function deposit(bytes32 destination, uint256 expectedHeld, uint256 amount) public payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| destination | bytes32 | ChannelId to be credited. | 
| expectedHeld | uint256 | The number of wei the depositor believes are _already_ escrowed against the channelId. | 
| amount | uint256 | The intended number of wei to be deposited. | 

### _transferAsset

Transfers the given number of wei to a supplied ethereum address.

```solidity
function _transferAsset(address payable destination, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| destination | address payable | Ethereum address to be credited. | 
| amount | uint256 | Quantity of wei to be transferred. | 

