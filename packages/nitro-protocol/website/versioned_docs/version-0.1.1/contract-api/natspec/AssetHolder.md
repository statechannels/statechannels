---
id: version-0.1.1-AssetHolder
title: AssetHolder.sol
original_id: AssetHolder
---

View Source: [contracts/AssetHolder.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/AssetHolder.sol)

**↗ Extends: [IAssetHolder](IAssetHolder.md)**
**↘ Derived Contracts: [ERC20AssetHolder](ERC20AssetHolder.md), [ETHAssetHolder](ETHAssetHolder.md), [TESTAssetHolder](TESTAssetHolder.md)**

An implementation of the IAssetHolder interface. The AssetHolder contract escrows ETH or tokens against state channels. It allows assets to be internally accounted for, and ultimately prepared for transfer from one channel to other channel and/or external destinations, as well as for guarantees to be claimed. Note there is no deposit function and the _transferAsset function is unimplemented; inheriting contracts should implement these functions in a manner appropriate to the asset type (e.g. ETH or ERC20 tokens).

---

## Contract Members
**Constants & Variables**

```solidity
//internal members
address internal AdjudicatorAddress;

//public members
mapping(bytes32 => uint256) public holdings;
mapping(bytes32 => bytes32) public assetOutcomeHashes;

```

## Modifiers

- [AdjudicatorOnly](#adjudicatoronly)

### AdjudicatorOnly

```solidity
modifier AdjudicatorOnly() internal
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

## Functions

- [_transferAll](#_transferall)
- [transferAll](#transferall)
- [transferAllAdjudicatorOnly](#transferalladjudicatoronly)
- [claimAll](#claimall)
- [_setAssetOutcomeHash](#_setassetoutcomehash)
- [setAssetOutcomeHash](#setassetoutcomehash)
- [_transferAsset](#_transferasset)
- [_isExternalDestination](#_isexternaldestination)
- [_addressToBytes32](#_addresstobytes32)
- [_bytes32ToAddress](#_bytes32toaddress)

---

### _transferAll

Transfers the funds escrowed against `channelId` to the beneficiaries of that channel. No checks performed.

```solidity
function _transferAll(bytes32 channelId, bytes allocationBytes) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| allocationBytes | bytes | The abi.encode of AssetOutcome.Allocation | 

### transferAll

Transfers the funds escrowed against `channelId` to the beneficiaries of that channel. Checks against the storage in this contract.

```solidity
function transferAll(bytes32 channelId, bytes allocationBytes) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| allocationBytes | bytes | The abi.encode of AssetOutcome.Allocation | 

### transferAllAdjudicatorOnly

Transfers the funds escrowed against `channelId` to the beneficiaries of that channel. No checks performed against storage in this contract. Permissioned.

```solidity
function transferAllAdjudicatorOnly(bytes32 channelId, bytes allocationBytes) external nonpayable AdjudicatorOnly 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| allocationBytes | bytes | The abi.encode of AssetOutcome.Allocation | 

### claimAll

Transfers the funds escrowed against `guarantorChannelId` to the beneficiaries of the __target__ of that channel.

```solidity
function claimAll(bytes32 guarantorChannelId, bytes guaranteeBytes, bytes allocationBytes) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| guarantorChannelId | bytes32 | Unique identifier for a guarantor state channel. | 
| guaranteeBytes | bytes | The abi.encode of Outcome.Guarantee | 
| allocationBytes | bytes | The abi.encode of AssetOutcome.Allocation for the __target__ | 

### _setAssetOutcomeHash

Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping

```solidity
function _setAssetOutcomeHash(bytes32 channelId, bytes32 assetOutcomeHash) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| assetOutcomeHash | bytes32 | The keccak256 of the abi.encode of the Outcome. | 

### setAssetOutcomeHash

Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping.

```solidity
function setAssetOutcomeHash(bytes32 channelId, bytes32 assetOutcomeHash) external nonpayable AdjudicatorOnly 
returns(success bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| assetOutcomeHash | bytes32 | The keccak256 of the abi.encode of the Outcome. | 

### _transferAsset

Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.

```solidity
function _transferAsset(address payable destination, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| destination | address payable | ethereum address to be credited. | 
| amount | uint256 | Quantity of assets to be transferred. | 

### _isExternalDestination

Checks if a given destination is external (and can therefore have assets transferred to it) or not.

```solidity
function _isExternalDestination(bytes32 destination) internal pure
returns(bool)
```

**Returns**

True if the destination is external, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| destination | bytes32 | Destination to be checked. | 

### _addressToBytes32

Converts an ethereum address to a nitro external destination.

```solidity
function _addressToBytes32(address participant) internal pure
returns(bytes32)
```

**Returns**

The input address left-padded with zeros.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| participant | address | The address to be converted. | 

### _bytes32ToAddress

Converts a nitro destination to an ethereum address.

```solidity
function _bytes32ToAddress(bytes32 destination) internal pure
returns(address payable)
```

**Returns**

The rightmost 160 bits of the input string.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| destination | bytes32 | The destination to be converted. | 

