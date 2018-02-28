
pragma solidity ^0.4.18;

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

  function forceMove(channel, agreedState, yourSig, nextState, mySig) {

  }

  function move(channel, nextState, mySig) {
  }

  function settleAndWithdraw() {

  }

  // special functions
  function withdrawAfterFirstDeposit() {
  }

  function withdrawAfterSecondDeposit() {

  }

}
