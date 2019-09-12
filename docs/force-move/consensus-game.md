---
id: consensus-game
title: The Consensus Game
---

Purpose: advance the channel outcome only if all participants are in agreement.

The application data has the format:

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
