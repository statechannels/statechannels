pragma solidity ^0.4.18;

library CommonState {
  // channelType
  // channelNonce
  // stateNonce
  // numberOfParticipants
  // participants

  function channelType(bytes _state) returns (address _channelType) {
    assembly {
      _channelType := mload(add(_state, 0x20))
    }
  }

  function channelNonce(bytes _state) returns (uint _channelNonce) {
    assembly {
      _channelNonce := mload(add(_state, 0x20))
    }
  }

  function stateNonce(bytes _state) returns (uint) {

  }

  function numberOfParticipants(bytes _state) returns (uint _numberOfParticipants) {
    assembly {
      _numberOfParticipants := mload(add(_state, 0x20))
    }

    require(_numberOfParticipants == 2); // for now
  }

  function participants(bytes _state) returns (address[]) {

  }

  function channelId(bytes _state) returns (bytes32) {
    return keccak256(channelType(_state), participants(_state), channelNonce(_state));
  }

  function mover(bytes _state) returns (address) {
    return participants(_state)[stateNonce(_state) % numberOfParticipants(_state)];
  }

}
