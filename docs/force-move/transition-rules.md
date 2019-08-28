---
id: transition-rules
title: Transition Rules
---

In order to comply with ForceMove, participants must take turns to broadcast their commitments. Furthermore, there are strict rules about whether a commitment is valid, based on the previous commitment that has been announced. Beyond conforming to the state format, there are certain relationships that must hold between the commitment in question, and the previously announced commitment.

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

## Implementation of Core transition rules

The actual signature for the internal, core `_validTransition` function makes use of the `VariablePart` struct defined in the page on [state format](./state-format)

In `/contracts/OptimizedForceMove.sol`:

```solidity
    function _validTransition(
        uint256 nParticipants,
        bool[2] memory isFinalAB, // [a.isFinal, b.isFinal]
        ForceMoveApp.VariablePart[2] memory ab, // [a,b]
        uint256 turnNumB,
        address appDefinition
    ) internal pure returns (bool)
```

A later [check on the signatures](./valid-signatures) for the submitted states implies (if it passes) that the following fields are equal for a and b:
`chainId`, `participants`, `channelNonce`, `appDefinition`, `challengeDuration`, and that `b.turnNum = a.turnNum + 1`. This is because the `stateHashes` are computed on chain from a single `fixedPart` which is submitted (and implicitly copied across all states) as well as a single `largestTurnNum` (which is implicitly decremented as we step back through the submitted states). This means that the core `_validTransition` function need only perform the remaining checks. See the contract itself for the full implementation.

## Application-specific transition rules

In addition to the core `validTransition` rules, there are application-specific rules. These are left open to application developers, who must specify these rules in a single function conforming to the following interface

In `/contracts/ForceMoveApp.sol`:

```solidity
interface ForceMoveApp {
  //...

  function validTransition(
    VariablePart calldata a,
    VariablePart calldata b,
    uint256 turnNumB,
    uint256 nParticipants
  ) external pure returns (bool);
}
```

For example, one can implement a simple counting application

In `/contracts/CountingApp.sol`:

```solidity
contract CountingApp is ForceMoveApp {
  struct CountingAppData {
    uint256 counter;
  }

  function appData(bytes memory appDataBytes) internal pure returns (CountingAppData memory) {
    return abi.decode(appDataBytes, (CountingAppData));
  }

  function validTransition(
    VariablePart memory a,
    VariablePart memory b,
    uint256 turnNumB,
    uint256 nParticipants
  ) public pure returns (bool) {
    require(
      appData(b.appData).counter == appData(a.appData).counter + 1,
      'CountingApp: Counter must be incremented'
    );
    require(keccak256(b.outcome) == keccak256(a.outcome), 'CountingApp: Outcome must not change');
    return true;
  }
}
```

but other examples exist: such as a[ payment channel](https://github.com/magmo/force-move-protocol/blob/master/packages/fmg-payments/contracts/PaymentApp.sol), or games of [Rock Paper Scissors](https://github.com/magmo/apps/blob/master/packages/rps/contracts/RockPaperScissorsGame.sol) and [Tic Tac Toe](https://github.com/magmo/apps/blob/master/packages/tictactoe/contracts/TicTacToeGame.sol)..

**Channel setup**  
Participants must

- exchange some initial commitments
- ensure the channel is funded
- begin execution of the application by exchanging further commitments

**Cooperative channel closing**  
If a participant signs a commitment with `isFinal = true`, then in a cooperative channel-closing procedure the other players can countersign that commitment \(with turnNum still changing appropriately\). Once a full set of `n` such commitments exists \(this set is known as a **finalization proof**\) any player may use it to finalize the channel on-chain.

In Nitro, the existence of this possibility is relied on \(counterfactually\) to close a channel off-chain.
