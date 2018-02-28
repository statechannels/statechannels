pragma solidity ^0.4.18;

contract TimedSecretExchange {
  enum StateTypes { ExchangeProposed, ExchangeRejected, SecretRevealed, SecretAcknowledged }

  // Not all states will need all the properties above to be set.
  // The following are minimal valid states:
  // State(StateType.ExchangeProposed, 10, 2560, 'hashedSecret', _)
  // State(StateType.ExchangeRejected, _, _, _, _)
  // State(StateType.SecretRevealed, 10, 2560, _, 'secret')
  // State(StateType.SecretAcknowledged, 10, _, _, _)
  struct State {
    StateType stateType;
    uint reward;
    address proposer;
    address revealer;
    uint blockNumDeadline;
    bytes hashedSecret;
    bytes secret;
  }

  // The following transitions are allowed:
  //
  // ExchangeProposed -> ExchangeRejected
  // ExchangeProposed -> SecretRevealed
  // SecretRevealed -> SecretAcknowledged
  //
  function validTransition(State _old, State _new) {
    require(_old.reward == _new.reward); // no changing the reward
    require(_old.proposer == _new.proposer); // .. or the proposer
    require(_old.revealer == _new.revealer); // .. or the revealer

    if (_old.stateType == StateType.ExchangeProposed) {
      if (_new.stateType == StateType.ExchangeRejected) {
        // always ok
      } else if (_new.stateType == StateType.SecretRevealed) {
        require(_old.blockNumDeadline == _new.blockNumDeadline); // no changing the deadline
        require(keccak256(_new.secret) == _old.hashedSecret); // secret must be valid
      } else {
        require(false); // no other transition valid
      }
    } else if (_old.stateType == StateType.SecretRevealed) {
      require(_new.stateType == StateType.SecretAcknowledged);
    } else {
      require(false); // no other transitions valid
    }
  }

  function resolution(State _state) public returns (mapping(address => uint)) {
    mapping(address => uint) memory settlement = new mapping(address => uint);

    if (_state.stateType == StateType.ExchangeProposed ||
        _state.stateType == StateType.ExchangeRejected)  {
      settlement[_state.proposer] = _state.reward; // give reward back to proposer
    } else if (_state.stateType == StateType.SecretRevealed) {
      if (block.number < _state.blockNumDeadline) {
        settlement[_state.revealer] = _state.reward; // in on time, so get reward
      } else {
        settlement[_state.proposer] = _state.reward; // too late!
      }
    } else if (_state.stateType == StateType.SecretAcknowledged) {
      settlement[_state.revealer] = _state.reward; // if we acknowledged they get reward
                                                   // regardless of current time
    }

    return settlement;
  }
}
