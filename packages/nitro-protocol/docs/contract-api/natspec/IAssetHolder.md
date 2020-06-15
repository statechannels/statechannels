---
id: IAssetHolder
title: IAssetHolder.sol
---

View Source: [contracts/interfaces/IAssetHolder.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/interfaces/IAssetHolder.sol)

**↘ Derived Contracts: [AssetHolder](AssetHolder.md)**

The IAssetHolder interface calls for functions that allow assets to be transferred from one channel to other channel and/or external destinations, as well as for guarantees to be claimed.

---

## Events

```solidity
event Deposited(bytes32 indexed destination, uint256  amountDeposited, uint256  destinationHoldings);
event AssetTransferred(bytes32 indexed channelId, bytes32 indexed destination, uint256  amount);
```

## Functions

- [transferAll](#transferall)
- [claimAll](#claimall)

---

### transferAll

Transfers the funds escrowed against `channelId` to the beneficiaries of that channel.

```solidity
function transferAll(bytes32 channelId, bytes allocationBytes) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel. | 
| allocationBytes | bytes | The abi.encode of AssetOutcome.Allocation | 

### claimAll

Transfers the funds escrowed against `guarantorChannelId` to the beneficiaries of the __target__ of that channel.

```solidity
function claimAll(bytes32 guarantorChannelId, bytes guaranteeBytes, bytes allocationBytes) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| guarantorChannelId | bytes32 | Unique identifier for a guarantor state channel. | 
| guaranteeBytes | bytes | The abi.encode of Outcome.Guarantee | 
| allocationBytes | bytes | The abi.encode of AssetOutcome.Allocation for the __target__ | 

