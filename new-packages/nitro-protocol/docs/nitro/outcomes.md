---
id: outcomes
title: Outcomes
---

```
(address assetHolder, bytes assetOutcome)[]
```

AssetOutcome has one of two types:

```
(uint8 type, bytes allocationOrGuarantee)
```

```
// allocation
(bytes32 destination, uint256 amount)[]

// guarantee
(address guaranteedChannel, bytes32[] destinations)
```

## Destinations

Destinations are either addresses or channel ids
Destinations are stored as `bytes32`.
If the left-most 12 bytes are all 0, then the destination is an external address.
Otherwise, the address corresponds to a channel (and is equal to the channelId)
