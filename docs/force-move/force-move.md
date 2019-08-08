---
id: force-move
title: ForceMove
---

### ForceMove

Call:

`forceMove(State[] states, Signatures[] signatures, challengerSig)`

Notes:

Determine the channel from the `challengeState` (the final state in the array).

Requirements:

- States form a chain of valid transitions
- Channel is in the Open mode
- Signatures are valid for the states
- ChallengerSig is valid
- ChallengeTurnNum is greater than turnNumRecord

Effects:

- Sets turnNumRecord to the challengeTurnNum
- Sets finalizesAt to currentTime + challengeInterval
- Sets stateHash
- Sets challengerAddress
