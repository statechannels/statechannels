---
id: conclude
title: Conclude
---

### Conclude

Call

`conclude(States states, Signatures sigs)`

Notes:

Determine the channel from the `concludeState` (the first state in the array).

Requirements:

- Channel is in the Open mode or the Challenge mode
- First state is a conclude state
- States form a chain of valid transitions
- Signatures are valid for states

Effects:

- Sets finalizesAt to current time
- Sets challengeHash to the hash of the concludeState
- [Optionally] Clears turnNumRecord
- [Optionally] Clears challengerAddress
