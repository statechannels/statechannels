pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/State.sol";
import "fmg-core/contracts/Rules.sol";
import "fmg-core/contracts/ForceMoveGame.sol";

contract SimpleAdjudicator {
    // SimpleAdjudicator can support exactly one force move game channel
    // between exactly two players.
    using State for State.StateStruct;

    bytes32 public fundedChannelId;

    Rules.Challenge currentChallenge;
    uint challengeDuration;
    uint[2] withdrawnAmount;

    event FundsReceived(
        uint amountReceived,
        address sender,
        uint adjudicatorBalance
    );

    constructor(bytes32 _fundedChannelId, uint256 _challengeDurationMinutes) public payable {
        fundedChannelId = _fundedChannelId;
        challengeDuration = _challengeDurationMinutes * 1 minutes;

        emit FundsReceived(
            msg.value,
            msg.sender,
            address(this).balance
        );
    }

    // allow funds to be sent to the contract
    function () external payable {
        emit FundsReceived(
            msg.value,
            msg.sender,
            address(this).balance
        );
    }

    function forceMove (
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
      )
        public
        onlyWhenCurrentChallengeNotPresent
      {
        // 
        require(
            _fromState.channelId() == fundedChannelId,
            "channelId must match the game supported by the channel"
        );

        // passing _v, _r, _s directly to validForceMove gives a "Stack too deep" error
        uint8[] memory v = _v;
        bytes32[] memory r = _r;
        bytes32[] memory s = _s;

        require(
            Rules.validForceMove(_fromState, _toState, v, r, s),
            "must be a valid force move"
        );

        createChallenge(uint32(now + challengeDuration), _toState);
    }

    function concludeAndWithdraw(
        State.StateStruct memory _penultimateState,
        State.StateStruct memory _ultimateState,
        address participant,
        address payable destination,
        bytes32 _channelId,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
    ) public {
        if (!expiredChallengePresent()){
            _conclude(
                _penultimateState,
                _ultimateState,
                _v,
                _r,
                _s
            );
        }

        require(
            // You can't compare memory bytes (eg _ultimateState) with
            // storage bytes (eg. currentChallenge.state)
            keccak256(abi.encode(_ultimateState)) == keccak256(abi.encode(currentChallenge.state)),
            "Game already concluded with a different conclusion proof"
        );

        _withdraw(participant, destination,_channelId,_v[2],_r[2],_s[2]);

    }

    function conclude(
        State.StateStruct memory _penultimateState,
        State.StateStruct memory _ultimateState,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s)
    public onlyWhenGameOngoing 
    {
        _conclude(_penultimateState,_ultimateState,_v,_r,_s);
    }

    event GameConcluded();
    function _conclude(
        State.StateStruct memory _penultimateState,
        State.StateStruct memory _ultimateState,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
    )
      internal
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
        emit GameConcluded();
        
    }

    event Refuted(State.StateStruct refutation);
    function refute(State.StateStruct memory _refutationState, uint8 v, bytes32 r, bytes32 s)
      public
      onlyWhenCurrentChallengeActive
    {
        // channelId must match the game supported by the channel
        require(
            fundedChannelId == _refutationState.channelId(),
            "channelId must match"
        );

        // must be a valid refute according to framework rules
        require(
            Rules.validRefute(currentChallenge.state, _refutationState, v, r, s),
            "must be a valid refute"
        );

        cancelCurrentChallenge();

        emit Refuted(_refutationState);
    }

    event RespondedWithMove(State.StateStruct response);
    function respondWithMove(State.StateStruct memory _nextState, uint8 v, bytes32 r, bytes32 s)
      public
      onlyWhenCurrentChallengeActive
    {
        require(
            Rules.validRespondWithMove(currentChallenge.state, _nextState, v, r, s),
            "must be valid respond with move according to the framework rules"
        );

        cancelCurrentChallenge();
        emit RespondedWithMove(_nextState);
    }

    event RespondedWithAlternativeMove(State.StateStruct alternativeResponse);
    function alternativeRespondWithMove(
        State.StateStruct memory _alternativeState,
        State.StateStruct memory _nextState,
        uint8[] memory _v,
        bytes32[] memory _r,
        bytes32[] memory _s
    )
      public
      onlyWhenCurrentChallengeActive
    {
        // passing _v, _r, _s directly to validAlternativeRespondWithMove gives a "Stack too deep" error
        // uint8[] memory v = _v;
        // bytes32[] memory r = _r;
        // bytes32[] memory s = _s;

        // must be valid alternative respond with move according to the framework rules
        require(Rules.validAlternativeRespondWithMove(currentChallenge.state, _alternativeState, _nextState, _v, _r, _s));

        cancelCurrentChallenge();
        emit RespondedWithAlternativeMove(_nextState);
    }

    event ChallengeCreated(
        bytes32 channelId,
        State.StateStruct state,
        uint32 expirationTime,
        uint256[] payouts
    );

    function createChallenge(uint32 expirationTime, State.StateStruct memory _state) private {
        currentChallenge.channelId = fundedChannelId;
        currentChallenge.state = _state;
        currentChallenge.expirationTime = expirationTime;
        currentChallenge.payouts = _state.resolution;

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
        address payable destination,
        bytes32 _channelId, // not needed for the simple adjudicator, which only supports one channel
        uint8 v,
        bytes32 r,
        bytes32 s
    )
      public
    {
        return _withdraw(participant, destination, _channelId,v,r,s);
    }

    function _withdraw(
        address participant,
        address payable destination,
        bytes32 _channelId, // not needed for the simple adjudicator, which only supports one channel
        uint8 v,
        bytes32 r,
        bytes32 s
    )
      internal
      onlyWhenGameTerminated
    {

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

    function validTransition(State.StateStruct memory _fromState, State.StateStruct memory _toState) public pure returns(bool) {
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
        State.StateStruct memory endState = currentChallenge.state;
        for(uint8 i = 0; i < 2; i++) {
            if (endState.participants[i] == participant) {
                return i;
            }
        }
        revert("Participant not in game.");
    }

    // Modifiers
    modifier onlyWhenCurrentChallengePresent() {
        require(
            currentChallengePresent(),
            "current challenge must be present"
        );
        _;
    }

    modifier onlyWhenCurrentChallengeNotPresent() {
        require(
            !currentChallengePresent(),
            "current challenge must not be present"
        );
        _;
    }

    modifier onlyWhenGameTerminated() {
        require(
            expiredChallengePresent(),
            "game must be terminated"
        );
        _;
    }

    modifier onlyWhenGameOngoing() {
        require(
            !expiredChallengePresent(),
            "game must be ongoing"
        );
        _;
    }

    modifier onlyWhenCurrentChallengeActive() {
        require(
            activeChallengePresent(),
            "active challenge must be present"
        );
        _;
    }
}
