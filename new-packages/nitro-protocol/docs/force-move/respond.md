---
id: respond
title: Respond
---

### Respond

Call:

`respond(State challengeState, State nextState, Signature nextStateSig)`

Notes:

Determine the channel from the `nextState`.

Requirements:

- challengeState matches stateHash
- challengeState to nextState is a valid transition
- channel is in Challenge mode

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)
- Increases the turnNumRecord by 1
