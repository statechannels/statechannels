---
id: Adjudicator
title: Adjudicator.sol
---

View Source: [contracts/interfaces/Adjudicator.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/interfaces/Adjudicator.sol)

**↘ Derived Contracts: [NitroAdjudicator](NitroAdjudicator.md)**

An Adjudicator Interface calls for a method that allows a finalized outcome to be pushed to an asset holder.

---

## Functions

- [pushOutcome](#pushoutcome)

---

### pushOutcome

Allows a finalized channel's outcome to be decoded and one or more AssetOutcomes registered in external Asset Holder contracts.

```solidity
function pushOutcome(bytes32 channelId, uint48 turnNumRecord, uint48 finalizesAt, bytes32 stateHash, address challengerAddress, bytes outcomeBytes) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| channelId | bytes32 | Unique identifier for a state channel | 
| turnNumRecord | uint48 | A turnNum that (the adjudicator knows and stores) is supported by a signature from each participant. | 
| finalizesAt | uint48 | The unix timestamp when this channel will finalize | 
| stateHash | bytes32 | The keccak256 of the abi.encode of the State (struct) stored by the adjudicator | 
| challengerAddress | address | The address of the participant whom registered the challenge, if any. | 
| outcomeBytes | bytes | The encoded Outcome of this state channel. | 

