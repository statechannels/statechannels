---
id: nitro-adjudicator
title: NitroAdjudicator.sol
sidebar_label: NitroAdjudicator.sol
---

Please see the [API](../contract-api/natspec/NitroAdjudicator).

## pushOutcome

The Nitro Adjudicator contract extends (inherits from) ForceMove, and had an additional method `pushOutcome`. The `pushOutcome` method allows one or more `assetOutcomes` to be registered against a channel in a number of AssetHolder contracts (specified by the `outcome` stored in this contract).

Signature:

```solidity
    function pushOutcome(
        bytes32 channelId,
        uint256 turnNumRecord,
        uint256 finalizesAt,
        bytes32 stateHash,
        address challengerAddress,
        bytes memory outcome
    ) public
```

Checks:

- Does the submitted data hash to the channel storage for this channel?

Effects:

- decode `assetOutcomes` from `outcome`
- for each AssetHolder specified in `assetOutcomes`, call `setOutcome`.
