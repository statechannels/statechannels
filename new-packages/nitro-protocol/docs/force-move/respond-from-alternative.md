---
id: respond-from-alternative
title: Respond From Alternative
---

### RespondFromAlternative

Call:

`respondFromAlternative(State[] states, Signatures[] signatures)`

Notes:

Determine the channel from the `responseState` (the final state in the array).

Requirements:

- States form a chain of valid transitions
- Channel is in the Challenge mode
- Signatures are valid for the states
- The responseState turnNum > turnNumRecord

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)
- Sets turnNumRecord to the turnNum of the responseState
