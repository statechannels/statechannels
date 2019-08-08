---
id: refute
title: Refute
---

### Refute

Call

`refute(State refutationState, Signature sig)`

Notes:

Determine the channel from the `refutationState` (the final state in the array).

Requirements:

- Channel is in the Challenge mode
- The refutationState's turnNum is greater than the turnNumRecord
- Sig is the challenger's signature on the refutationState

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)
