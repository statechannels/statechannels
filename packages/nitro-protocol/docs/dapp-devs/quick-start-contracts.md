---
id: quick-start-contracts
title: Quick start (contracts)
---

The first step is to cast your application as a state machine. In particular, you must author a single smart contract, conforming to the [`ForceMoveApp`](../contract-api/natspec/ForceMoveApp) interface.

You'll want to pull this interface, as well as the `Outcome`library contract into your project using your favourite node package manager:

```console
> yarn add @statechannels/nitro-protocol
```

The `ForceMoveApp` interface calls for an application-specific `validTransition(a,b)` function. This function needs to decode the `appData`, from state channel updates `a` and `b`, and decide if `b` is an acceptable transition from `a`. For example, in a game of chess, the position of the king in `b.appData` must be within one square of its position in `a.appData`.

### Example

For example, one can implement a simple counting application

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
  ) public pure override returns (bool) {
    require(
      appData(b.appData).counter == appData(a.appData).counter + 1,
      'CountingApp: Counter must be incremented'
    );
    require(keccak256(b.outcome) == keccak256(a.outcome), 'CountingApp: Outcome must not change');
    return true;
  }
}
```

Other examples exist: such as games of [Rock Paper Scissors](https://github.com/statechannels/apps/blob/master/packages/rps/contracts/RockPaperScissors.sol) and [Tic Tac Toe](https://github.com/statechannels/apps/blob/master/packages/tic-tac-toe/contracts/TicTacToe.sol).
