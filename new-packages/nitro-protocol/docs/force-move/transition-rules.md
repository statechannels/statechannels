---
id: transition-rules
title: Transition Rules
---

In order to comply with Nitro, participants must take turns to broadcast their commitments. Furthermore, there are strict rules about whether a commitment is valid, based on the previous commitment that has been announced. Beyond conforming to the [commitment format,](commitment-format.md) there are certain relationships that must hold between the commitment in question, and the preciously announced commitment.

## Core transition rules

The full rule set is:

```javascript
validTransition(a, b) <=>
  b.turnNum == a.turnNum + 1
  b.chainId == a.chainId
  b.participants == a.participants
  b.appDefinition == a.appDefinition
  b.challengeDuration == a.challengeDuration
  a.signer == a.mover
  b.signer == b.mover
  if b.isFinal
     b.defaultOutcome == a.defaultOutcome
  else if b.turnNum <= 2n
     a.isFinal == False
     b.defaultOutcome == a.defaultOutcome
     b.appData == a.appData
   else
     a.isFinal == False
     b.app.validTransition(a, b)
```

## Application-specific transition rules

In addition to the core `validTransition` rules, there are application-specific rules. These are left open to application developers, who must specify these rules in a single function:

In `apps/packages/wallet/contracts/TestGame.sol`:

```solidity
contract TestGame {
    function validTransition(Commitment.CommitmentStruct memory _old, Commitment.CommitmentStruct memory _new) public pure returns (bool) {
       return true;
    }
}
```

Here we have shown a trivial function, but other examples exist: such as a[ payment channel](https://github.com/magmo/force-move-protocol/blob/master/packages/fmg-payments/contracts/PaymentApp.sol), or games of [Rock Paper Scissors](https://github.com/magmo/apps/blob/master/packages/rps/contracts/RockPaperScissorsGame.sol) and [Tic Tac Toe](https://github.com/magmo/apps/blob/master/packages/tictactoe/contracts/TicTacToeGame.sol)..

**Consensus game**  
This is a particular set of application rules that Nitro protocol uses for the construction of state channel networks: it is the **only** application that runs in a ledger channel. It allows any participant to propose a new state, and for all other participants \(in turn\) to either consent to this new state or to reject it. An implementation is available [here](https://github.com/magmo/force-move-games/blob/master/packages/fmg-nitro-adjudicator/contracts/ConsensusApp.sol) .

**Channel setup**  
Participants must

- exchange some initial commitments
- ensure the channel is funded
- begin execution of the application by exchanging further commitments

**Cooperative channel closing**  
If a participant signs a commitment with `isFinal = true`, then in a cooperative channel-closing procedure the other players can countersign that commitment \(with turnNum still changing appropriately\). Once a full set of `n` such commitments exists \(this set is known as a **finalization proof**\) any player may use it to finalize the channel on-chain \(see section on [redistribution of assets](redistribution-of-assets.md#conclude)\).

This existence of this possibility is relied on \(counterfactually\) to close a channel off-chain.
