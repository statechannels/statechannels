pragma solidity ^0.4.24;

// truffle will only create artifacts for contracts from external modules if they
// are referenced by a contract in the `contracts` or `test` directory. The purpose
// of this contract is to work around this limitation, by mentioning the contracts
// that are used in the tests.

import "fmg-core/test/test-game/contracts/CountingState.sol";
import "fmg-core/test/test-game/contracts/CountingGame.sol";