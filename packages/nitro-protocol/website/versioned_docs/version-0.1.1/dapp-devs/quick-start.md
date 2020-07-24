---
id: version-0.1.1-quick-start
title: Quick start
original_id: quick-start
---

The first step is to cast your application as a state machine. In particular, you must author a single smart contract, conforming to the [ForceMoveApp](../contract-api/natspec/ForceMoveApp) interface.

The interface calls for an application-specific validTransition(a,b) function. This function needs to decode the appData, from state channel updates a and b, and decide if b is an acceptable transition from a. For example, in a game of chess, the position of the king in b.appData must be within one square of its position in a.appData.

### Example

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

Other examples exist: such as games of [Rock Paper Scissors](https://github.com/statechannels/apps/blob/master/packages/rps/contracts/RockPaperScissors.sol) and [Tic Tac Toe](https://github.com/magmo/apps/blob/master/packages/tictactoe/contracts/TicTacToeGame.sol).

:::note
The linked examples conform to a legacy ForceMoveApp interface.
:::
