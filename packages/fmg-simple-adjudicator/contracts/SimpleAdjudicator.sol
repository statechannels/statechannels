pragma solidity ^0.4.23;

import "fmg-core/contracts/State.sol";
import "fmg-core/contracts/Rules.sol";
import "fmg-core/contracts/ForceMoveGame.sol";

contract SimpleAdjudicator {
    // SimpleAdjudicator can support exactly one force move game channel
    // between exactly two players.
    using State for bytes;

    bytes32 public fundedChannelId;

    Rules.Challenge currentChallenge;
    uint challengeDuration = 1 days;
    uint[2] withdrawnAmount;

    event FundsReceived(
        uint amountReceived,
        address sender,
        uint adjudicatorBalance
    );

    constructor(bytes32 _fundedChannelId) public payable {
        fundedChannelId = _fundedChannelId;

        emit FundsReceived(
            msg.value,
            msg.sender,
            address(this).balance
        );
    }

    // allow funds to be sent to the contract
    function () public payable {
        emit FundsReceived(
            msg.value,
            msg.sender,
            address(this).balance
        );
    }

    function forceMove (
        bytes _fromState,
        bytes _toState,
        uint8[] _v,
        bytes32[] _r,
        bytes32[] _s
      )
        external
        onlyWhenCurrentChallengeNotPresent
      {
        // channelId must match the game supported by the channel
        require(_fromState.channelId() == fundedChannelId);

        // passing _v, _r, _s directly to validForceMove gives a "Stack too deep" error
        uint8[] memory v = _v;
        bytes32[] memory r = _r;
        bytes32[] memory s = _s;

        // must be a valid force move
        require(Rules.validForceMove(_fromState, _toState, v, r, s));

        createChallenge(uint32(now + challengeDuration), _toState);
    }

    function conclude(
        bytes _penultimateState,
        bytes _ultimateState,
        uint8[] _v,
        bytes32[] _r,
        bytes32[] _s
    )
      external
      onlyWhenGameOngoing
    {
        // channelId must match the game supported by the channel
        require(_penultimateState.channelId() == fundedChannelId);

        // passing _v, _r, _s directly to validConclusionProof gives a "Stack too deep" error
        uint8[] memory v = _v;
        bytes32[] memory r = _r;
        bytes32[] memory s = _s;

        // must be a valid conclusion proof according to framework rules
        require(Rules.validConclusionProof(_penultimateState, _ultimateState, v, r, s));

        // Create an expired challenge, (possibly) overwriting any existing challenge
        createChallenge(uint32(now), _ultimateState);
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
        currentChallenge.payouts = State.resolution(_state);

        emit ChallengeCreated(
            currentChallenge.channelId,
            currentChallenge.state,
            currentChallenge.expirationTime,
            currentChallenge.payouts
        );
    }

    function recoverParticipant(
        address participant,
        address destination,
        bytes32 _channelId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view returns (address) {
        bytes32 h = keccak256(abi.encodePacked(participant, destination, fundedChannelId)); 
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";

        bytes32 prefixedHash = keccak256(
            abi.encodePacked(prefix, h)
        );

        return ecrecover(prefixedHash, v, r, s);
    }

    function withdraw(
        address participant,
        address destination,
        bytes32 _channelId, // not needed for the simple adjudicator, which only supports one channel
        uint8 v,
        bytes32 r,
        bytes32 s
    )
      public
      onlyWhenGameTerminated
    {
        require(
            _channelId == fundedChannelId,
            "Can only withdraw from the funded channel id"
        );

        // check that the participant has signed off on the destination
        // address for the funds
        require(
            participant == recoverParticipant(participant, destination, _channelId, v, r, s),
            "Participant must sign off on destination address"
        );

        uint8 idx = participantIdx(participant);

        uint owedToA = currentChallenge.payouts[0] - withdrawnAmount[0];
        uint aPending = min(address(this).balance, owedToA);

        uint amount;
        if (idx == 0) {
            amount = aPending;
        } else if (idx == 1) {
            uint owedToB = currentChallenge.payouts[1] - withdrawnAmount[1];
            uint bPending = min(address(this).balance - aPending, owedToB);
            amount = bPending;
        }

        destination.transfer(amount);
        withdrawnAmount[idx] = withdrawnAmount[idx] + amount;
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

    modifier onlyWhenGameTerminated() {
        require(expiredChallengePresent());
        _;
    }

    modifier onlyWhenGameOngoing() {
        require(!expiredChallengePresent());
        _;
    }

    modifier onlyWhenCurrentChallengeActive() {
        require(activeChallengePresent());
        _;
    }
}
