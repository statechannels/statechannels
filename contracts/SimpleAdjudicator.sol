
pragma solidity ^0.4.18;

interface ForcedMoveGame {
    function validTransition(bytes oldState, bytes newState) public pure returns (bool);
    function resolve(bytes) public returns (uint, uint);
}

contract SimpleAdjudicator {
  // SimpleAdjudicator can support exactly one forced move game channel

  bytes32 channelId;

  Challenge currentChallenge;

  struct Channel {
    address channelType;
    address participantA;
    address participantB;
    uint channelNonce;
  }

  struct State {
    uint stateNonce;
    address lastMover;
    bytes gameState;
  }

  struct Challenge {
    address challengee;
    bytes gameState;
  }

  /* function forceMove(channel, agreedState, yourSig, nextState, mySig) public {

  }



  function move(challenge, nextState, mySig) {
  }

  function settleAndWithdraw() {

  }

  // special functions
  function withdrawAfterFirstDeposit() {
  }

  function withdrawAfterSecondDeposit() {

  } */

  function testDelegation(address channelType, bytes _state) public returns (uint, uint) {
    State memory state = unpack(_state);
    uint aBal;
    uint bBal;
    ForcedMoveGame game = ForcedMoveGame(channelType);

    (aBal, bBal) = game.resolve(state.gameState);

    return (aBal, bBal);
  }

  function testGameStateExtraction(bytes _state) public pure returns (bytes) {
    State memory state = unpack(_state);
    return state.gameState;
  }


  function unpack(bytes _state) private pure returns (State) {
    uint256 stateNonce;
    address lastMover;
    uint newGameStatePtr;
    uint oldGameStatePtr;

    uint256 gameStateLength = _state.length - 64;
    bytes memory gameState = new bytes(gameStateLength);

    assembly {
      stateNonce := mload(add(_state, 32))
      lastMover := mload(add(_state, 64))
      oldGameStatePtr := add(_state, 96)
      newGameStatePtr := add(gameState, 0x20)
    }

    memcpy(newGameStatePtr, oldGameStatePtr, gameStateLength);

    return State(stateNonce, lastMover, gameState);
  }

  // https://github.com/Arachnid/solidity-stringutils/blob/master/strings.sol#L45
  function memcpy(uint dest, uint src, uint len) private pure {
      // Copy word-length chunks while possible
      for(; len >= 32; len -= 32) {
          assembly {
              mstore(dest, mload(src))
          }
          dest += 32;
          src += 32;
      }

      // Copy remaining bytes
      uint mask = 256 ** (32 - len) - 1;
      assembly {
          let srcpart := and(mload(src), not(mask))
          let destpart := and(mload(dest), mask)
          mstore(dest, or(destpart, srcpart))
      }
  }


}
