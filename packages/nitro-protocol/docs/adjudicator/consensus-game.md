---
id: consensus-game
title: The Consensus Game
---

The Consensus Game is a ForceMove compliant application whose existence is key to Nitro Protocol itself. Its purpose is to allow the channel outcome to be updated if and only if all participants are in agreement. This is in contrast to a generic `ForceMoveApp`, where the current mover has a unilateral right to update the channel outcome (as long as the update conforms to the generic transition rules).

Progressing the channel outcome via unanimous consensus allows some of the more advanced features of Nitro protocol, such as topping-up the funds in a ledger channel.

The Consensus Game (also known as the Consensus App) represents a state of consensus or non-consensus in application data of the format:

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

## Implementation

```solidity
    struct ConsensusAppData {
        uint32 furtherVotesRequired;
        bytes proposedOutcome;
    }

    function appData(bytes memory appDataBytes) internal pure returns (ConsensusAppData memory) {
        return abi.decode(appDataBytes, (ConsensusAppData));
    }

    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint256, // turnNumB
        uint256 numParticipants
    ) public pure returns (bool) {
        ConsensusAppData memory appDataA = appData(a.appData);
        ConsensusAppData memory appDataB = appData(b.appData);

        if (appDataB.furtherVotesRequired == numParticipants - 1) {
            // propose/veto/pass
            require(
                identical(a.outcome, b.outcome),
                'ConsensusApp: when proposing/vetoing/passing outcome must not change'
            );
        } else if (appDataB.furtherVotesRequired == 0) {
            // final vote
            require(
                appDataA.furtherVotesRequired == 1,
                'ConsensusApp: invalid final vote, furtherVotesRequired must transition from 1'
            );
            require(
                identical(appDataA.proposedOutcome, b.outcome),
                'ConsensusApp: invalid final vote, outcome must equal previous proposedOutcome'
            );
        } else {
            // vote
            require(
                appDataB.furtherVotesRequired == appDataA.furtherVotesRequired - 1,
                'ConsensusApp: invalid vote, furtherVotesRequired should decrement'
            );
            require(
                identical(a.outcome, b.outcome),
                'ConsensusApp: when voting, outcome must not change'
            );
            require(
                identical(appDataA.proposedOutcome, appDataB.proposedOutcome),
                'ConsensusApp: invalid vote, proposedOutcome must not change'
            );
        }
        return true;
    }
```
