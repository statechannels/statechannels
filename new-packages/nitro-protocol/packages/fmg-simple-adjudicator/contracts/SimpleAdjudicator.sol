pragma solidity ^0.4.23;

import "fmg-core/contracts/CommonState.sol";
import "fmg-core/contracts/Framework.sol";
import "fmg-core/contracts/ForceMoveGame.sol";

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
        uint8[] _v,
        bytes32[] _r,
        bytes32[] _s
      )
        external
        onlyWhenCurrentChallengeNotPresent
      {
        // channelId must match the game supported by the channel
        require(_yourState.channelId() == fundedChannelId);

        // passing _v, _r, _s directly to validForceMove gives a "Stack too deep" error
        uint8[] memory v = _v;
        bytes32[] memory r = _r;
        bytes32[] memory s = _s;

        // must be a valid force move
        require(Framework.validForceMove(_yourState, _myState, v, r, s));

        createChallenge(uint32(now + challengeDuration), _myState);
    }

    function conclude(
        bytes _yourState,
        bytes _myState,
        uint8[] _v,
        bytes32[] _r,
        bytes32[] _s
    )
      external
    {
        // channelId must match the game supported by the channel
        require(_yourState.channelId() == fundedChannelId);

        // passing _v, _r, _s directly to validConclusionProof gives a "Stack too deep" error
        uint8[] memory v = _v;
        bytes32[] memory r = _r;
        bytes32[] memory s = _s;

        // must be a valid conclusion proof according to framework rules
        require(Framework.validConclusionProof(_yourState, _myState, v, r, s));

        // Create an expired challenge, (possibly) overwriting any existing challenge
        createChallenge(uint32(now), _myState);
    }

    function refute(bytes _refutationState, uint8 v, bytes32 r, bytes32 s)
      external
      onlyWhenCurrentChallengeActive
    {
        // channelId must match the game supported by the channel
        require(fundedChannelId == _refutationState.channelId());

        // must be a valid refute according to framework rules
        require(Framework.validRefute(currentChallenge.state, _refutationState, v, r, s));

        cancelCurrentChallenge();
    }

    function respondWithMove(bytes _nextState, uint8 v, bytes32 r, bytes32 s)
      external
      onlyWhenCurrentChallengeActive
    {
        // must be valid respond with move according to the framework rules
        require(Framework.validRespondWithMove(currentChallenge.state, _nextState, v, r, s));

        cancelCurrentChallenge();
    }

    function alternativeRespondWithMove(
        bytes _alternativeState,
        bytes _nextState,
        uint8[] _v,
        bytes32[] _r,
        bytes32[] _s
    )
      external
      onlyWhenCurrentChallengeActive
    {
        // passing _v, _r, _s directly to validAlternativeRespondWithMove gives a "Stack too deep" error
        uint8[] memory v = _v;
        bytes32[] memory r = _r;
        bytes32[] memory s = _s;

        // must be valid alternative respond with move according to the framework rules
        require(Framework.validAlternativeRespondWithMove(currentChallenge.state, _alternativeState, _nextState, v, r, s));

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
