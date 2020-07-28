---
id: version-0.1.1-TESTAssetHolder
title: TESTAssetHolder.sol
original_id: TESTAssetHolder
---

View Source: [contracts/test/TESTAssetHolder.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/test/TESTAssetHolder.sol)

**↗ Extends: [AssetHolder](AssetHolder.md)**
**↘ Derived Contracts: [TESTAssetHolder2](TESTAssetHolder2.md)**

This contract extends the AssetHolder contract to enable it to be more easily unit-tested. It exposes public or external functions that set storage variables or wrap otherwise internal functions. It should not be deployed in a production environment.

---

## Functions

- [](#)
- [setHoldings](#setholdings)
- [setAssetOutcomeHashPermissionless](#setassetoutcomehashpermissionless)
- [transferAllAdjudicatorOnly](#transferalladjudicatoronly)
- [isExternalDestination](#isexternaldestination)
- [addressToBytes32](#addresstobytes32)

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

### setHoldings

Manually set the holdings mapping to a given amount for a given channelId.  Shortcuts the deposit workflow (ONLY USE IN A TESTING ENVIRONMENT)

```solidity
function setHoldings(bytes32 channelId, uint256 amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| amount | uint256 | The number of assets that should now be "escrowed: against channelId | 

### setAssetOutcomeHashPermissionless

Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping, but circumvents the AdjudicatorOnly modifier (thereby allowing externally owned accounts to call the method).

```solidity
function setAssetOutcomeHashPermissionless(bytes32 channelId, bytes32 assetOutcomeHash) external nonpayable
returns(success bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| assetOutcomeHash | bytes32 | The keccak256 of the abi.encode of the Outcome. | 

### transferAllAdjudicatorOnly

Transfers the funds escrowed against `channelId` to the beneficiaries of that channel. No checks performed against storage in this contract. Permissions have been bypassed for testing purposes.

```solidity
function transferAllAdjudicatorOnly(bytes32 channelId, bytes allocationBytes) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| allocationBytes | bytes | The abi.encode of AssetOutcome.Allocation | 

### isExternalDestination

Wrapper for otherwise internal function. Checks if a given destination is external (and can therefore have assets transferred to it) or not.

```solidity
function isExternalDestination(bytes32 destination) public pure
returns(bool)
```

**Returns**

True if the destination is external, false otherwise.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| destination | bytes32 | Destination to be checked. | 

### addressToBytes32

Wrapper for otherwise internal function. Converts an ethereum address to a nitro external destination.

```solidity
function addressToBytes32(address participant) public pure
returns(bytes32)
```

**Returns**

The input address left-padded with zeros.

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| participant | address | The address to be converted. | 

