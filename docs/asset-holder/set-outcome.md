---
id: set-outcome
title: setAssetOutcomeHash
---

The `setAssetOutcomeHash` method allows an outcome (more strictly, an outcomeHash) to be registered against a channel. It may only be called by the Nitro Adjudicator.

Signature:

```solidity
    function seAssetOutcomeHash(bytes32 channelId, bytes32 assetOutcomeHash)
        external
        AdjudicatorOnly
        returns (bool success)
```

## Checks:

- A single adjudicator address is baked into this contract at deploy-time
- Is `msg.sender` equal to this address?

## Effects

- store `assetOutcomeHash` against `channelId`.
