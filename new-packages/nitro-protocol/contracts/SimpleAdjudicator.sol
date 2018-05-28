pragma solidity ^0.4.23;

import "./CommonState.sol";
import "./Framework.sol";
import "./ForceMoveGame.sol";

contract SimpleAdjudicator {
    // SimpleAdjudicator can support exactly one force move game channel
    using CommonState for bytes;

    bytes32 public fundedChannelId;

    Framework.Challenge currentChallenge;
    uint challengeDuration = 1 days;

    constructor(bytes32 _fundedChannelId) public payable {
        fundedChannelId = _fundedChannelId;
    }

    // allow funds to be sent to the contract
    function () public payable {
    }

    function forceMove (
        bytes _yourState,
        bytes _myState,
        uint8[] v,
        bytes32[] r,
        bytes32[] s
      )
        external
        onlyWhenCurrentChallengeNotPresent
      {
        // states must be signed by the appropriate participant
        _yourState.requireSignature(v[0], r[0], s[0]);
        _myState.requireSignature(v[1], r[1], s[1]);

        // both states must match the game supported by the channel
        require(_yourState.channelId() == fundedChannelId);
        require(_myState.channelId() == fundedChannelId);

        // nonce must have incremented
        require(_myState.turnNum() == _yourState.turnNum() + 1);

        // must be a valid transition
        require(validTransition(_yourState, _myState));

        createChallenge(uint32(now + challengeDuration), _myState);
    }

    function conclude(
        bytes _yourState,
        bytes _myState,
        uint8[] v,
        bytes32[] r,
        bytes32[] s
    )
      external
    {
        // all states must be Concluded
        require(ForceMoveGame(_yourState.channelType()).isConcluded(_yourState));
        require(ForceMoveGame(_myState.channelType()).isConcluded(_myState));

        // states must be signed by the appropriate participant
        _yourState.requireSignature(v[0], r[0], s[0]);
        _myState.requireSignature(v[1], r[1], s[1]);

        // both states must match the game supported by the channel
        require(_yourState.channelId() == fundedChannelId);
        require(_myState.channelId() == fundedChannelId);

        // nonce must have incremented
        require(_myState.turnNum() == _yourState.turnNum() + 1);

        // must be a valid transition
        require(validTransition(_yourState, _myState));

        // Create an expired challenge, (possibly) overwriting any existing challenge
        createChallenge(uint32(now), _myState);
    }

    function refute(bytes _refutationState, uint8 v, bytes32 r, bytes32 s)
      external
      onlyWhenCurrentChallengeActive
    {
        require(currentChallenge.state.channelId() == _refutationState.channelId());

        // the refutationState must have a higher nonce
        require(_refutationState.turnNum() > currentChallenge.state.turnNum());
        // ... with the same mover
        require(_refutationState.mover() == currentChallenge.state.mover());
        // ... and be signed (by that mover)
        _refutationState.requireSignature(v, r, s);

        cancelCurrentChallenge();
    }

    function respondWithMove(bytes _nextState, uint8 v, bytes32 r, bytes32 s)
      external
      onlyWhenCurrentChallengeActive
    {
        require(currentChallenge.state.channelId() == _nextState.channelId());

        // check that the nonce has increased
        require(currentChallenge.state.turnNum() + 1 == _nextState.turnNum());

        // check that the challengee's signature matches
        _nextState.requireSignature(v, r, s);

        // must be valid transition
        require(validTransition(currentChallenge.state, _nextState));

        cancelCurrentChallenge();
    }

    function alternativeRespondWithMove(
        bytes _alternativeState,
        bytes _nextState,
        uint8[] v,
        bytes32[] r,
        bytes32[] s
    )
      external
      onlyWhenCurrentChallengeActive
    {
        require(currentChallenge.state.channelId() == _nextState.channelId());

        // checking the alternative state:
        // .. it must have the same nonce as the challenge state
        require(currentChallenge.state.turnNum() == _alternativeState.turnNum());
        // .. it must be signed (by the challenger)
        _alternativeState.requireSignature(v[0], r[0], s[0]);

        // checking the nextState:
        // .. the nonce must have increased by 1
        require(currentChallenge.state.turnNum() + 1 == _nextState.turnNum());
        // .. it must be a valid transition of the gamestate (from the alternative state)
        require(validTransition(_alternativeState, _nextState));
        // .. it must be signed (my the challengee)
        _nextState.requireSignature(v[1], r[1], s[1]);

        cancelCurrentChallenge();
    }

    function createChallenge(uint32 expirationTime, bytes _state) private {
        currentChallenge.state = _state;
        currentChallenge.expirationTime = expirationTime;

        (currentChallenge.resolvedBalances[0], currentChallenge.resolvedBalances[1]) = ForceMoveGame(_state.channelType()).resolve(_state);
    }

    function withdraw()
      public
      onlyWhenCurrentChallengeExpired
    {
        currentChallenge.state.participant(0).transfer(
          min(currentChallenge.resolvedBalances[0], address(this).balance)
        );
        currentChallenge.state.participant(1).transfer(
          min(currentChallenge.resolvedBalances[1], address(this).balance)
        );

        cancelCurrentChallenge(); // prevent multiple withdrawals
    }

    function validTransition(bytes _fromState, bytes _toState) public pure returns(bool) {
        return Framework.validTransition(_fromState, _toState);
    }

    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    function cancelCurrentChallenge() private{
        // TODO: zero out everything(?)
        currentChallenge.expirationTime = 0;
    }

    function currentChallengePresent() public view returns (bool) {
        return currentChallenge.expirationTime > 0;
    }

    function activeChallengePresent() public view returns (bool) {
        return (currentChallenge.expirationTime > now);
    }

    function expiredChallengePresent() public view returns (bool) {
        return currentChallengePresent() && !activeChallengePresent();
    }

    // Modifiers
    modifier onlyWhenCurrentChallengeNotPresent() {
        require(!currentChallengePresent());
        _;
    }

    modifier onlyWhenCurrentChallengeExpired() {
        require(expiredChallengePresent());
        _;
    }

    modifier onlyWhenCurrentChallengeActive() {
        require(activeChallengePresent());
        _;
    }
}
