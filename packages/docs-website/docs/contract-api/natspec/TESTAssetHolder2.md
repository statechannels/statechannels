---
id: TESTAssetHolder2
title: TESTAssetHolder2.sol
---

View Source: [contracts/test/TESTAssetHolder2.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/test/TESTAssetHolder2.sol)

**↗ Extends: [TESTAssetHolder](TESTAssetHolder.md)**

This contract is a clone of the TESTAssetHolder contract. It is used for testing purposes only, to enable testing of transferAll and claimAll in multiple AssetHolders. It has a dummy storage variable in order to change the ABI. TODO remove the need for this contract by allowing TESTAssetHolder to be deployed twice.

---

## Contract Members
**Constants & Variables**

```solidity
bool public dummy;

```

## Functions

- [](#)

---

### 

Constructor function storing the AdjudicatorAddress.

```solidity
function (address _AdjudicatorAddress) public nonpayable TESTAssetHolder 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _AdjudicatorAddress | address | Address of an Adjudicator  contract, supplied at deploy-time. | 

