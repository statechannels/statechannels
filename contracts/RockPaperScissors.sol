pragma solidity ^0.4.18;

contract RockPaperScissors {
  enum StateType { Start, RoundProposed, RoundAccepted, Reveal, Final }
  enum Play { Rock, Paper, Scissors }

  struct State {
    StateType stateType;
    uint256 aBal;
    uint256 bBal;
    uint256 stake;
    bytes32 aPreCommit;
    Play bPlay;
    Play aPlay;
    bytes32 aSalt;
  }

  // The following transitions are allowed:
  //
  // Start -> RoundProposed
  // RoundProposed -> Start // reject game
  // RoundProposed -> RoundAccepted
  // RoundAccepted -> Reveal
  // Reveal -> Start
  // Start -> Final
  //
  function validTransition(bytes _old, bytes _new) public pure returns (bool) {
    State memory oldState = unpack(_old); // inefficient to do all the unpacking upfront, but ok for now
    State memory newState = unpack(_new);

    if (oldState.stateType == StateType.Start) {
      if (newState.stateType == StateType.RoundProposed) {
        require(newState.stake > 0);
        require(oldState.aBal >= newState.stake); // avoid integer overflow attacks
        require(oldState.bBal >= newState.stake); // avoid integer overflow attacks
        require(newState.aBal + newState.stake == oldState.aBal); // stake removed from aBal
        require(newState.bBal + newState.stake == oldState.bBal); // stake removed from bBal

        // we should maybe require that aPreCommit isn't empty, but then it will only hurt a later if it is
        return true;
      } else if (newState.stateType == StateType.Final) {
        require(newState.aBal == oldState.aBal);
        require(newState.bBal == oldState.bBal);
        return true;
      }
    } else if (oldState.stateType == StateType.RoundProposed) {
      if (newState.stateType == StateType.Start) { // game rejected
        require(newState.aBal == oldState.stake + oldState.aBal); // stake returned from aBal
        require(newState.bBal == oldState.stake + oldState.bBal); // stake returned from bBal
        return true;
      } else if (newState.stateType == StateType.RoundAccepted) {
        require(newState.aBal == oldState.aBal);
        require(newState.bBal == oldState.bBal);
        require(newState.stake == oldState.stake);
        require(newState.aPreCommit == oldState.aPreCommit);
        return true;
      }
    } else if (oldState.stateType == StateType.RoundAccepted) {
      if (newState.stateType == StateType.Reveal) {
        require(newState.aBal == oldState.aBal);
        require(newState.bBal == oldState.bBal);
        require(newState.stake == oldState.stake);
        require(newState.bPlay == oldState.bPlay);

        // need to convert Play -> uint256 to get hash to work
        bytes32 hashed = keccak256(uint256(newState.aPlay), newState.aSalt);
        require(hashed == oldState.aPreCommit);

        return true;
      }
    } else if (oldState.stateType == StateType.Reveal) {
      if (newState.stateType == StateType.Start) {
        uint256 aWinnings;
        uint256 bWinnings;
        (aWinnings, bWinnings) = winnings(oldState.aPlay, oldState.bPlay, oldState.stake);

        assert(newState.aBal == oldState.aBal + aWinnings);
        assert(newState.bBal == oldState.bBal + bWinnings);

        return true;
      }
    }

    revert();
  }

  // in this case the resolution function is pure, but it doesn't have to be in general
  function resolve(bytes _state) public pure returns (uint aBal, uint bBal) {
    State memory state = unpack(_state);

    if (state.stateType == StateType.Start) {
      aBal = state.aBal;
      bBal = state.bBal;
    } else if (state.stateType == StateType.Final) {
      aBal = state.aBal;
      bBal = state.bBal;
    } else if (state.stateType == StateType.RoundProposed) {
      aBal = state.aBal + state.stake;
      bBal = state.bBal + state.stake;
    } else if (state.stateType == StateType.RoundAccepted) {
      // if we're stuck here, assume a doesn't want to move
      // TODO: how do we know it's a's move ...
      aBal = state.aBal;
      bBal = state.bBal + 2 * state.stake;
    } else if (state.stateType == StateType.Reveal) {
      // in this state we need to know who won
      uint256 aWinnings;
      uint256 bWinnings;
      (aWinnings, bWinnings) = winnings(state.aPlay, state.bPlay, state.stake);

      aBal = state.aBal + aWinnings;
      bBal = state.bBal + bWinnings;
    } else {
      revert();
    }
  }

  function winnings(Play firstPlay, Play secondPlay, uint256 stake) private pure returns (uint256, uint256) {
      if (firstPlay == secondPlay) { // no-one won
        return (stake, stake);
      } else if ((firstPlay == Play.Rock && secondPlay == Play.Scissors) ||
                 (firstPlay > secondPlay)) { // first player won
        return (2 * stake, 0);
      } else { // second player won
        return (0, 2 * stake);
      }
  }

  function unpack(bytes _state) private pure returns (State) {
    StateType stateType;
    uint256 aBal;
    uint256 bBal;
    uint256 stake;
    bytes32 aPreCommit;
    Play bPlay;
    Play aPlay;
    bytes32 aSalt;

    assembly {
      stateType := mload(add(_state, 32))
      aBal := mload(add(_state, 64))
      bBal := mload(add(_state, 96))
      stake := mload(add(_state, 128))
      aPreCommit := mload(add(_state, 160))
      bPlay := mload(add(_state, 192))
      aPlay := mload(add(_state, 224))
      aSalt := mload(add(_state, 256))
    }

    return State(stateType, aBal, bBal, stake, aPreCommit, bPlay, aPlay, aSalt);
  }


}
