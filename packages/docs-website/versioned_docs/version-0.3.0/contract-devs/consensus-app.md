---
id: consensus-app
title: ConsensusApp.sol
original_id: consensus-app
---

The Consensus App (or Consensus Game) is a [`ForceMoveApp`](../contract-api/natspec/ForceMoveApp) compliant application which can be used by participants who wish to reach unanimous consensus about a new outcome. Its purpose is to allow the channel outcome to be updated if and only if all participants are in agreement. This is in contrast to a generic `ForceMoveApp`, where the current mover has a unilateral right to update the channel outcome (as long as the update conforms to the generic transition rules).

Please see the [API](../contract-api/natspec/ConsensusApp).

Progressing the channel outcome via unanimous consensus allows some of the more advanced features of Nitro protocol, such as topping-up the funds in a ledger channel.

## Explicit ConsensusApp

The Consensus App represents a state of consensus or non-consensus in application data of the format:

```solidity
struct ConsensusGameData {
  uint32 furtherVotesRequired;
  bytes proposedOutcome;
}
```

The app also has access to the `currentOutcome`, which is passed through with the game data.

The allowed transitions are:

1. Propose: `(i, w, -) -> (n-1, w, w')`
   - oldState.currentOutcome == newState.currentOutcome
   - newState.furtherVotesRequired == nParticipants - 1
2. Vote: `(i+1, w, w') -> (i, w, w')`
   - oldState.furtherVotesRequired > 1
   - newState.currentOutcome == oldState.currentOutcome
   - newState.proposedOutcome == oldState.proposedOutcome
   - newState.furtherVotesRequired == oldState.furtherVotesRequired - 1
3. FinalVote: `(1, w, w') -> (0, w', -)`
   - oldState.furtherVotesRequired == 1
   - newState.furtherVotesRequired == 0
   - newState.currentOutcome == oldState.proposedOutcome
   - newState.proposedOutcome can be anything
4. Veto: `(i, w, w') -> (n-1, w, -)`
   - to veto you just propose something different
   - newState.proposedOutcome can be anything
5. Pass: `(n-1, w, -) -> (n-1, w, -)`
   - pass is just a special case of veto where i = n - 1

Note: either a transition is a veto, or you can switch on `furtherVotesRequired` to determine which of cases 1-3 it is.

<div class="mermaid">
graph LR
linkStyle default interpolate basis
   A("consensus <br /> (0, w, -)")-->|Propose| B("proposal <br /> (n-1, w, w')")
   B-->|Vote| C("proposal <br /> (n-2, w, w')")
   C-->|...| D("proposal <br /> (1, w, w')")
   D-->|FinalVote| E("consensus <br /> (0, w', -)")
   B-->|Veto| B
   C-->|Veto| B
   D-->|Veto| B
</div>

## Implicit or 'null' app

A more elegant approach to reaching consensus is to exploit the abilitiy for participants to support a state by countersigning it.

Replace the consensus app with the "null" app.

```solidity
function validTransition(s1, s2) {
  return false
}
```

In the current implementation of `ForceMove.sol`, this is equivalent to using `appDefinition = address(0)` (or any address that has no rules). So now contract need actually be deployed.

If outcome `o1` is supported, and Alice wants to propose outcome `o2`, then she can simply sign a state with that outcome and broadcast it.

- If everyone signs it, we've reached consensus.
- If someone doesn't sign it, then `forceMove(s1)` closes the channel with `s1`, since there are no valid transitions.

This is more scalable than the explicit consensus app: In a channel with `n` participants, ForceMove guarantees that any participant can close the consensus app in `O(n)` time. Since there are no valid moves in the null app, anyone can close the null app in `O(1)` time.
