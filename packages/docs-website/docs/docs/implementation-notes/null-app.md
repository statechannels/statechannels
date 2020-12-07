---
id: null-app
title: Null app
---

import Mermaid from '@theme/Mermaid';

Progressing the channel outcome via unanimous consensus allows some of the more advanced features of Nitro protocol, such as topping-up the funds in a ledger channel.

An elegant approach to reaching consensus is to exploit the abilitiy for participants to support a state by countersigning it.

One can imagine a ficticious "null" app.

```solidity
function validTransition(s1, s2) {
  return false
}
```

This is only ficticious because, in the current implementation of `ForceMove.sol`, this is equivalent to using `appDefinition = address(0)` (or any address that has no rules). So no contract need actually be deployed.

If outcome `o1` is supported, and Alice wants to propose outcome `o2`, then she can simply sign a state with that outcome and broadcast it.

- If everyone signs it, we've reached consensus.
- If someone doesn't sign it, then `forceMove(s1)` closes the channel with `s1`, since there are no valid transitions.

This is more scalable than an explicit consensus app: In a channel with `n` participants, ForceMove guarantees that any participant can close an app with valid transitions in `O(n)` time. Since there are no valid moves in the null app, anyone can close the null app in `O(1)` time.
