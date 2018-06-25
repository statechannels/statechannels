pragma solidity ^0.4.23;

import "fmg-core/contracts/State.sol";
import "fmg-core/contracts/Rules.sol";
import "fmg-core/contracts/ForceMoveGame.sol";

contract SimpleAdjudicator {
    // SimpleAdjudicator can support exactly one force move game channel
    using State for bytes;

    bytes32 public fundedChannelId;

    Rules.Challenge currentChallenge;
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
        require(Rules.validForceMove(_yourState, _myState, v, r, s));

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
        require(Rules.validConclusionProof(_yourState, _myState, v, r, s));

        // Create an expired challenge, (possibly) overwriting any existing challenge
        createChallenge(uint32(now), _myState);
    }

    event Refuted(bytes refutation);
    function refute(bytes _refutationState, uint8 v, bytes32 r, bytes32 s)
      external
      onlyWhenCurrentChallengeActive
    {
        // channelId must match the game supported by the channel
        require(fundedChannelId == _refutationState.channelId());

        // must be a valid refute according to framework rules
        require(Rules.validRefute(currentChallenge.state, _refutationState, v, r, s));

        cancelCurrentChallenge();
        emit Refuted(_refutationState);
    }

    event RespondedWithMove(bytes response);
    function respondWithMove(bytes _nextState, uint8 v, bytes32 r, bytes32 s)
      external
      onlyWhenCurrentChallengeActive
    {
        // must be valid respond with move according to the framework rules
        require(Rules.validRespondWithMove(currentChallenge.state, _nextState, v, r, s));

        cancelCurrentChallenge();
        emit RespondedWithMove(_nextState);
    }

    event RespondedWithAlternativeMove(bytes alternativeResponse);
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
        require(Rules.validAlternativeRespondWithMove(currentChallenge.state, _alternativeState, _nextState, v, r, s));

        cancelCurrentChallenge();
        emit RespondedWithAlternativeMove(_nextState);
    }

    event ChallengeCreated(
        bytes32 channelId,
        bytes state,
        uint32 expirationTime,
        uint256[] payouts
    );

    function createChallenge(uint32 expirationTime, bytes _state) private {
        currentChallenge.channelId = fundedChannelId;
        currentChallenge.state = _state;
        currentChallenge.expirationTime = expirationTime;

        uint256 remaining = address(this).balance;
        uint256[] memory payouts = State.resolution(_state);
        for(uint i = 0; i < payouts.length; i++) {
            payouts[i] = min(payouts[i], remaining); // don't pay out more than what we have
            if (remaining >= payouts[i]) {
                remaining = remaining - payouts[i];
            } else {
                remaining = 0;
            }
        }

        currentChallenge.payouts = payouts;

        emit ChallengeCreated(
            currentChallenge.channelId,
            currentChallenge.state,
            currentChallenge.expirationTime,
            currentChallenge.payouts
        );
    }

    function withdraw(address participant)
      public
      onlyWhenCurrentChallengeExpired
    {
        uint8 idx = participantIdx(participant);
        uint amount = currentChallenge.payouts[idx];
        currentChallenge.payouts[idx] = currentChallenge.payouts[idx] - amount;
        participant.transfer(amount);
    }

    function validTransition(bytes _fromState, bytes _toState) public pure returns(bool) {
        return Rules.validTransition(_fromState, _toState);
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

    function participantIdx(address participant)
      private view
      onlyWhenCurrentChallengePresent // otherwise, we don't know that we've seen a valid game state yet
      returns (uint8) {
        bytes memory endState = currentChallenge.state;
        address[] memory p = State.participants(endState);
        for(uint8 i = 0; i < 2; i++) {
            if (p[i] == participant) {
                return i;
            }
        }
        revert("Participant not in game.");
    }

    // Modifiers
    modifier onlyWhenCurrentChallengePresent() {
        require(currentChallengePresent());
        _;
    }

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
