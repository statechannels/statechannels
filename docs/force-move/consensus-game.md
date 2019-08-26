---
id: consensus-game
title: The Consensus Game
---

Purpose: advance the channel outcome only if all participants are in agreement.

The application data has the format:

```solidity
struct ConsensusGameData {
  uint32 furtherVotesRequired;
  bytes currentOutcome;
  bytes proposedOutcome;
}
```

The allowed transitions are:

1. Propose: `(0, w, -) -> (n-1, w, w')`
   - oldState.currentOutcome == newState.currentOutcome
   - oldState.furtherVotesRequired == 0
   - newState.furtherVotesRequired == nParticipants - 1
2. Vote: `(i+1, w, w') -> (i, w, w')`
   - oldState.furtherVotesRequired > 1
   - newState.currentOutcome == oldState.currentOutcome
   - newState.proposedOutcome == oldState.proposedOutcome
   - newState.furtherVotesRequired == oldState.furtherVotesRequired - 1
3. FinalVote: `(1, w, w') -> (0, w', -)`
   - oldState.furtherVotesRequired == 1
   - newState.furtherVotesRequired == 0
   - newState.currentOutcome == oldState.currentOutcome
   - newState.proposedOutcome is empty
4. Veto: `(i, w, w') -> (0, w, -)`
   - newState.furtherVotesRequired == 0
   - newState.currentOutcome = oldState.currentOutcome
   - newState.proposedOutcome is empty
5. Pass: `(0, w, -) -> (0, w, -)`
   - Covered by veto
