pragma solidity ^0.4.18;

import './CommonState.sol';

interface ForcedMoveGame {
    function validTransition(bytes oldState, bytes newState) public pure returns (bool);
    function resolve(bytes) public returns (uint, uint);
    function isFinal(bytes) public returns (bool);
}

contract SimpleAdjudicator {
  // SimpleAdjudicator can support exactly one forced move game channel
  using CommonState for bytes;

  bytes32 public fundedChannelId;

  Challenge currentChallenge;
  uint challengeDuration = 1 days;

  struct Challenge {
    bytes32 channelId;
    bytes state;
    uint256[2] resolvedBalances;
    uint32 readyAt;
  }

  function SimpleAdjudicator(bytes32 _fundedChannelId) public payable {
    fundedChannelId = _fundedChannelId;
  }

  // allow funds to be sent to the contract
  function () payable {
  }

  function forceMove(
    bytes _yourState,
    bytes _myState,
    uint8[] v,
    bytes32[] r,
    bytes32[] s
  ) public {
    // need currentChallenge to be empty
    require(currentChallenge.readyAt == 0);

    // states must be signed by the appropriate participant
    _yourState.requireSignature(v[0], r[0], s[0]);
    _myState.requireSignature(v[1], r[1], s[1]);

    // both states must match the game supported by the channel
    require(_yourState.channelId() == fundedChannelId);
    require(_myState.channelId() == fundedChannelId);

    // nonce must have incremented
    require(_myState.stateNonce() == _yourState.stateNonce() + 1);

    // must be a valid transition
    require(ForcedMoveGame(_yourState.channelType()).validTransition(_yourState, _myState));

    currentChallenge.state = _myState;
    currentChallenge.readyAt = uint32(now + challengeDuration);
    // figure out the resolution immediately
    (currentChallenge.resolvedBalances[0], currentChallenge.resolvedBalances[1]) = ForcedMoveGame(_yourState.channelType()).resolve(_myState);
  }

  function respondWithMove(bytes _nextState, uint8 v, bytes32 r, bytes32 s) public {
    // check that there is a current challenge
    require(currentChallenge.readyAt != 0);
    // and that we're within the timeout
    require(currentChallenge.readyAt > now);

    require(currentChallenge.state.channelId() == _nextState.channelId());

    // check that the nonce has increased
    require(currentChallenge.state.stateNonce() + 1 == _nextState.stateNonce());

    // check that the challengee's signature matches
    _nextState.requireSignature(v, r, s);

    // must be valid transition
    require(ForcedMoveGame(_nextState.channelType()).validTransition(currentChallenge.state, _nextState));

    // Cancel challenge.
    // TODO: zero out everything(?)
    currentChallenge.readyAt = 0;
  }


  /* function refuteChallenge(bytes _refutationState, uint8[] v, bytes32[] r, bytes32[] s) {

  } */

  function withdrawFunds() public {
    // we need there to be a challenge
    require(currentChallenge.readyAt != 0);

    // check that the timeout has expired
    require(currentChallenge.readyAt <= now);

    // check that the funds are less than the balance
    // (not strictly necessary when only supporting one game like this SimpleAdjudicator does)
    /* require(currentChallenge.balances[0] + currentChallenge.balances[1] <= this.balance); */

    address[] memory participants;
    //TODO (participants[0], participants[1]) = currentChallenge.state.participants();
    // send the funds
    participants[0].transfer(currentChallenge.resolvedBalances[0]);
    participants[1].transfer(currentChallenge.resolvedBalances[1]);
  }

  function instantWithdrawal(
    bytes _state,
    uint8[] v,
    bytes32[] r,
    bytes32[] s
  ) public {
    require(ForcedMoveGame(_state.channelType()).isFinal(_state));

    // agreedState must be double-signed
    _state.requireFullySigned(v, r, s);
    uint[] memory balances;
    (balances[0], balances[1]) = ForcedMoveGame(_state.channelType()).resolve(_state);

    address[] memory participants;
    //TODO (participants[0], participants[1]) = _state.participants();
    // send the funds
    participants[0].transfer(balances[0]);
    participants[1].transfer(balances[1]);

  }


  /*
  // special functions
  function withdrawAfterFirstDeposit() {
  }

  function withdrawAfterSecondDeposit() {

  } */

}
