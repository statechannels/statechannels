pragma solidity ^0.5.0;

// truffle will only create artifacts for contracts from external modules if they
// are referenced by a contract in the `contracts` or `test` directory. The purpose
// of this contract is to work around this limitation, by mentioning the contracts
// that are used in the tests.

import "fmg-core/contracts/Rules.sol";
import "fmg-core/contracts/State.sol";
import "fmg-core/contracts/test-game/CountingGame.sol";
import "fmg-core/contracts/test-game/CountingState.sol";