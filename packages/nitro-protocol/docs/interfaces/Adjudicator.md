---
id: Adjudicator
title: Adjudicator
---



***
## Functions:
- [`pushOutcome`](#pushOutcome)
***
<a id=pushOutcome />
## `pushOutcome`

Allows a finalized channel's outcome to be decoded and one or more AssetOutcomes registered in external Asset Holder contracts.

#### Parameters:
- `channelId`: Unique identifier for a state channel

- `turnNumRecord`: A turnNum that (the adjudicator knows and stores) is supported by a signature from each participant.

- `finalizesAt`: The unix timestamp when this channel will finalize

- `stateHash`: The keccak256 of the abi.encode of the State (struct) stored by the adjudicator

- `challengerAddress`: The address of the participant whom registered the challenge, if any.

- `outcomeBytes`: The encoded Outcome of this state channel.



***
***
