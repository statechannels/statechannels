---
id: channel-storage
title: Channel Storage
---

### setOutcome

`setOutcome(bytes32 channelId, bytes outcome)`

Requirements

- Caller must be the adjudicator
- `outcomes[channelId]` must be empty

Effects

- Sets `outcomes[channelId] = hash(outcome)`
