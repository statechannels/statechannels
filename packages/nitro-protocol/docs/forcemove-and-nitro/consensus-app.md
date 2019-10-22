---
id: consensus-app
title: ConsensusApp.sol
---

The Consensus App (or Consensus Game) is a [`ForceMoveApp`](../natspec/ForceMoveApp) compliant application whose existence is key to Nitro Protocol itself. Its purpose is to allow the channel outcome to be updated if and only if all participants are in agreement. This is in contrast to a generic `ForceMoveApp`, where the current mover has a unilateral right to update the channel outcome (as long as the update conforms to the generic transition rules).

Please see the [API](../natspec/ConsensusApp).

Progressing the channel outcome via unanimous consensus allows some of the more advanced features of Nitro protocol, such as topping-up the funds in a ledger channel.

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

<div class="mermaid" align="center">
stateDiagram
  [*] --> Consensus
  Consensus
  Proposal
  Consensus --> Proposal: Propose
  Proposal --> Proposal: Vote
  Proposal --> Consensus: FinalVote
</div>

An example state progression: 
<div class="mermaid" align="center">
stateDiagram
  s0  --> s1 : propose
  s1  --> s2 : vote
  s2  --> sm : ... vote ...
  sm  --> sn : finalVote
  s0 : consensus (0,w,-)
  s1 : proposal (n-1,w,w')
  s2 : proposal (n-2,w,w')
  sm : proposal (1,w,w')
  sn : consensus (0,w',-)
</div>