
pragma solidity ^0.4.18;

interface ForcedMoveGame {
    function validTransition(bytes oldState, bytes newState) public pure returns (bool);
    function resolve(bytes) public returns (uint, uint);
    function isFinal(bytes) public returns (bool);
}

contract SimpleAdjudicator {
  // SimpleAdjudicator can support exactly one forced move game channel

  bytes32 fundedChannelId;

  Challenge currentChallenge;
  uint challengeDuration = 1 days;

  struct State {
    bytes32 channelId;
    uint stateNonce;
    address lastMover;
    bytes gameState;
  }

  struct Challenge {
    bytes32 channelId;
    address channelType;
    address[2] participants;
    uint8 challengerIndex;
    State challengersState;
    uint256[2] balances;
    uint32 readyAt;
  }

  function forceMove(
    address _channelType,
    address[2] _participants,
    uint8 _challengerIndex,
    uint _channelNonce,
    bytes _agreedState,
    bytes _challengersState,
    uint8[] v,
    bytes32[] r,
    bytes32[] s
  ) public {
    // need currentChallenge to be empty
    State memory agreedState = unpack(_agreedState);
    currentChallenge.challengersState = unpack(_challengersState);
    currentChallenge.participants = _participants;
    currentChallenge.challengerIndex = _challengerIndex;

    uint8 challengeeIndex;
    if (_challengerIndex == 0) {
      challengeeIndex = 1;
    } else if (_challengerIndex == 1) {
      challengeeIndex = 0;
    } else {
      revert();
    }

    // challenger should have made challengers move
    require(_participants[_challengerIndex] == currentChallenge.challengersState.lastMover);
    // agreedState must be double-signed
    require(_participants[challengeeIndex] == recoverSigner(_agreedState, v[0], r[0], s[0]));
    require(_participants[_challengerIndex] == recoverSigner(_agreedState, v[1], r[1], s[1]));

    // challengersState must be signed by challenger
    require(_participants[_challengerIndex] == recoverSigner(_challengersState, v[2], r[2], s[2]));

    // both states must match the game
    currentChallenge.channelType = _channelType;
    currentChallenge.channelId = keccak256(_channelType, _participants[0], _participants[1], _channelNonce);
    require(currentChallenge.channelId == agreedState.channelId);
    require(currentChallenge.channelId == currentChallenge.challengersState.channelId);

    // must be the next state
    require(currentChallenge.challengersState.stateNonce == agreedState.stateNonce + 1);

    // must be a valid transition
    //ForcedMoveGame channelGame = ForcedMoveGame(_channelType); // can't do this - too many variables?!
    require(ForcedMoveGame(_channelType).validTransition(agreedState.gameState, currentChallenge.challengersState.gameState));
    //todo: we probably need to pass through the mover - or at least if it's A or B, and the stateNonce

    currentChallenge.readyAt = uint32(now + challengeDuration);
    // figure out the resolution immediately
    (currentChallenge.balances[0], currentChallenge.balances[1]) = ForcedMoveGame(_channelType).resolve(currentChallenge.challengersState.gameState);
  }

  function respondWithMove(bytes _nextState, uint8 v, bytes32 r, bytes32 s) public {
    // check that there is a current challenge
    require(currentChallenge.readyAt != 0);
    // and that we're within the timeout
    require(currentChallenge.readyAt > now);

    uint8 challengeeIndex;
    if (currentChallenge.challengerIndex == 0) {
      challengeeIndex = 1;
    } else {
      challengeeIndex = 0;
    }

    State memory nextState = unpack(_nextState);
    // check that the channelId matches
    require(currentChallenge.channelId == nextState.channelId);

    // check that the nonce has increased
    require(currentChallenge.challengersState.stateNonce + 1 == nextState.stateNonce);

    // check that the challengee's signature matches
    require(currentChallenge.participants[challengeeIndex] == recoverSigner(_nextState, v, r, s));

    // must be valid transition
    require(ForcedMoveGame(currentChallenge.channelType).validTransition(currentChallenge.challengersState.gameState, nextState.gameState));

    // Cancel challenge.
    // TODO: zero out everything(?)
    currentChallenge.readyAt = 0;
  }


  function refuteChallenge(bytes _refutationState, uint8[] v, bytes32[] r, bytes32[] s) {


  }

  function withdrawFunds() public {
    // we need there to be a challenge
    require(currentChallenge.readyAt != 0);

    // check that the timeout has expired
    require(currentChallenge.readyAt <= now);

    // check that the funds are less than the balance
    // (not strictly necessary when only supporting one game like this SimpleAdjudicator does)
    /* require(currentChallenge.balances[0] + currentChallenge.balances[1] <= this.balance); */

    // send the funds
    currentChallenge.participants[0].transfer(currentChallenge.balances[0]);
    currentChallenge.participants[1].transfer(currentChallenge.balances[1]);
  }

  function instantWithdrawal(
    bytes _agreedFinalState,
    uint8[] v,
    bytes32[] r,
    bytes32[] s
  ) public {
    State memory agreedFinalState = unpack(_agreedFinalState);

    require(ForcedMoveGame(agreedFinalState.channelType).isFinal());

    // agreedState must be double-signed
    require(_participants[challengeeIndex] == recoverSigner(_agreedState, v[0], r[0], s[0]));
    require(_participants[challengeeIndex] == recoverSigner(_agreedState, v[0], r[0], s[0]));

  }


  /*
  // special functions
  function withdrawAfterFirstDeposit() {
  }

  function withdrawAfterSecondDeposit() {

  } */

  function unpack(bytes _state) private pure returns (State) {
    bytes32 channelId;
    uint256 stateNonce;
    address lastMover;
    uint newGameStatePtr;
    uint oldGameStatePtr;

    uint256 gameStateLength = _state.length - 0x60; // remove first 3 words
    bytes memory gameState = new bytes(gameStateLength);

    assembly {
      channelId := mload(add(_state, 0x20))
      stateNonce := mload(add(_state, 0x40))
      lastMover := mload(add(_state, 0x60))
      oldGameStatePtr := add(_state, 0x80)
      newGameStatePtr := add(gameState, 0x20)
    }

    memcpy(newGameStatePtr, oldGameStatePtr, gameStateLength);

    return State(channelId, stateNonce, lastMover, gameState);
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

  function recoverSigner(bytes _d, uint8 _v, bytes32 _r, bytes32 _s) internal pure returns(address) {
    bytes memory prefix = "\x19Ethereum Signed Message:\n32";
    bytes32 h = keccak256(_d);

    bytes32 prefixedHash = keccak256(prefix, h);

    address a = ecrecover(prefixedHash, _v, _r, _s);

    return(a);
  }
}
