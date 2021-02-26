---
id: quick-start-contracts
title: Quick start (contracts)
---

import Mermaid from '@theme/Mermaid';

You should begin your application design process by creating a single smart contract conforming to the [`ForceMoveApp`](../../contract-api/natspec/IForceMoveApp) interface.

You'll want to pull this interface, as well as the `Outcome` library contract, into your project using your favourite node package manager:

```console
> yarn add @statechannels/nitro-protocol
```

The `ForceMoveApp` interface calls for an application-specific `validTransition(a,b)` function. This function needs to decode the `appData`, from state channel updates `a` and `b`, and decide if `b` is an acceptable transition from `a`. For example, in a game of chess, the position of the king in `b.appData` must be within one square of its position in `a.appData`.

## Examples

For example, one can implement a simple counting application, where the stae of the channel can only be updated by incrementing a counter variable:

In `/contracts/CountingApp.sol`:

```solidity
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';

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
  ) public override pure returns (bool) {
    require(
      appData(b.appData).counter == appData(a.appData).counter + 1,
      'CountingApp: Counter must be incremented'
    );
    require(keccak256(b.outcome) == keccak256(a.outcome), 'CountingApp: Outcome must not change');
    return true;
  }
}
```

This example is unrepresentative, however, in that it does not allow any changes to the `outcome` of the channel. This means nothing of any value can change hands as the application is executed. A full ForceMoveApp should specify how the outcome is allowed to change during a transition: for example, if a chess player achieves checkmate, they might be permitted to claim all of the money in the channel.

More realistic ForceMoveApp examples exist: such as games of [Rock Paper Scissors](https://github.com/statechannels/apps/blob/master/packages/rps/contracts/RockPaperScissors.sol) and [Tic Tac Toe](https://github.com/statechannels/apps/blob/master/packages/tic-tac-toe/contracts/TicTacToe.sol), as well as a simple [Payment Channel](../implementation-notes/single-asset-payments) app.

## Design guide

In more complicated applications, it can help to adopt a [finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine) model, which means the application can be represented in a digram such as this:

<Mermaid chart=
'
stateDiagram-v2
[*] --> Resting
Resting --> Propose
Propose --> Resting
Propose --> Accept
Accept --> Reveal
Reveal --> Resting
' />

These finite states could be represented as a Solidity [`enum`](https://solidity.readthedocs.io/en/v0.6.0/types.html#enums). In ForceMove, the participants "leapfrog" each other on this diagram, i.e.:

- A starts at Resting
- B transitions to Propose
- A transitions to Accept
- B transitions to Reveal
- repeat

The `validTransition` function returns `true` only if the transition is one allowed by the arrows in the diagram (this is necessary but not sufficient, there are of course other checks made, too). On the other hand, Accept --> Propose is not allowed, so `validTransition` could return `false` in this case.

In fact, to provide more information, it actually calls `revert('No valid transition found');`.
