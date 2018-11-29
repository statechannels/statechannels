pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./State.sol";
// import "./ForceMoveGame.sol";

library Rules {
    using State for State.StateStruct;
    struct Challenge {
        bytes32 channelId;
        State.StateStruct state;
        uint32 expirationTime;
        uint256[] payouts;
    }

    function validForceMove(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        // states must be signed by the appropriate participant
        _fromState.requireSignature(v[0], r[0], s[0]);
        _toState.requireSignature(v[1], r[1], s[1]);

        return validTransition(_fromState, _toState);
    }

    function validConclusionProof(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        // states must be signed by the appropriate participant
        _fromState.requireSignature(v[0], r[0], s[0]);
        _toState.requireSignature(v[1], r[1], s[1]);

        // first move must be a concluded state (transition rules will ensure this for the other states)
        require(
            _fromState.isConclude(),
            "fromState must be Conclude"
        );
        // must be a valid transition
        return validTransition(_fromState, _toState);
    }

    function validRefute(
        State.StateStruct memory _challengeState,
        State.StateStruct memory _refutationState,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        require(
            _refutationState.turnNum > _challengeState.turnNum,
            "the refutationState must have a higher nonce"
        );
        require(
            _refutationState.mover() == _challengeState.mover(),
            "refutationState must have same mover as challengeState"
        );
        // ... and be signed (by that mover)
        _refutationState.requireSignature(v, r, s);

        return true;
    }

    function validRespondWithMove(
        State.StateStruct memory _challengeState,
        State.StateStruct memory _nextState,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        // check that the challengee's signature matches
        _nextState.requireSignature(v, r, s);

        require(
            validTransition(_challengeState, _nextState),
            "must be a valid transition"
        );

        return true;
    }

    function validAlternativeRespondWithMove(
        State.StateStruct memory _challengeState,
        State.StateStruct memory _alternativeState,
        State.StateStruct memory _nextState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {

        // checking the alternative state:
        require(
            _challengeState.channelId() == _alternativeState.channelId(),
            "alternativeState must have the right channel"
        );
        require(
            _challengeState.turnNum == _alternativeState.turnNum,
            "alternativeState must have the same nonce as the challenge state"
        );
        // .. it must be signed (by the challenger)
        _alternativeState.requireSignature(v[0], r[0], s[0]);

        // checking the nextState:
        // .. it must be signed (my the challengee)
        _nextState.requireSignature(v[1], r[1], s[1]);
        require(
            validTransition(_alternativeState, _nextState),
            "it must be a valid transition of the gamestate (from the alternative state)"
        );

        return true;
    }

    function validTransition(
        State.StateStruct memory  _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        require(
            _toState.channelId() == _fromState.channelId(),
            "Invalid transition: channelId must match on toState"
        );
        require(
            _toState.turnNum == _fromState.turnNum + 1,
            "Invalid transition: turnNum must increase by 1"
        );

        if (_fromState.isPreFundSetup()) {
            return validTransitionFromPreFundSetup(_fromState, _toState);
        } else if (_fromState.isPostFundSetup()) {
            return validTransitionFromPostFundSetup(_fromState, _toState);
        } else if (_fromState.isGame()) {
            return validTransitionFromGame(_fromState, _toState);
        } else if (_fromState.isConclude()) {
            return validTransitionFromConclude(_fromState, _toState);
        }

        return true;
    }

    function validTransitionFromPreFundSetup(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        if (_fromState.stateCount == _fromState.numberOfParticipants - 1) {
            // there are two options from the final PreFundSetup state
            // 1. PreFundSetup -> PostFundSetup transition
            // 2. PreFundSetup -> Conclude transition
            if (_toState.isPostFundSetup()) {
                require(
                    _toState.stateCount == 0,
                    "Invalid transition from PreFundSetup: stateCount must be reset when transitioning to PostFundSetup"
                );
                require(
                    State.gameAttributesEqual(_fromState, _toState),
                    "Invalid transition from PreFundSetup: gameAttributes must be equal"
                );
                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "Invalid transition from PreFundSetup: resolutions must be equal"
                );
            } else {
                require(
                    _toState.isConclude(),
                    "Invalid transition from PreFundSetup: stateType must be Conclude"
                );
                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "Invalid transition from PreFundSetup: resolutions must be equal"
                );
                
            }
        } else {
            // PreFundSetup -> PreFundSetup transition
            require(
                _toState.isPreFundSetup(),
                "Invalid transition from PreFundSetup: stateType must be PreFundSetup"
            );
            require(
                State.gameAttributesEqual(_fromState, _toState),
                "Invalid transition from PreFundSetup: gameAttributes must be equal"
            );
            require(
                _toState.stateCount == _fromState.stateCount + 1,
                "Invalid transition from PreFundSetup: stateCount must increase by 1"
            );
            require(
                State.resolutionsEqual(_fromState, _toState),
                "Invalid transition from PreFundSetup: resolutions must be equal"
            );
        }
        return true;
    }

    function validTransitionFromPostFundSetup(
        State.StateStruct memory  _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        if (_fromState.stateCount == _fromState.numberOfParticipants - 1) {
            if (_toState.isGame()) {
                require(
                    validGameTransition(_fromState, _toState),
                    "Invalid transition from PostFundSetup: transition must be valid"
                );
            } else {
                require(
                    _toState.isConclude(),
                    "Invalid transition from PostFundSetup: stateType must be Conclude"
                );

                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "Invalid transition from PostFundSetup: resolutions must be equal"
                );

                require(
                    _toState.stateCount == 0,
                    "Invalid transition from PostFundSetup: stateCount must be reset when transitioning to Conclude"
                );
            }
        } else {
            // Two possibilities:
            // 1. PostFundSetup -> PostFundSetup transition
            // 2. PostFundSetup -> Conclude transition
            if (_toState.isPostFundSetup()) {
                // PostFundSetup -> PostFundSetup
                require(
                    State.gameAttributesEqual(_fromState, _toState),
                    "Invalid transition from PostFundSetup: gameAttributes must be equal"
                );
                require(
                    _toState.stateCount == _fromState.stateCount + 1,
                    "Invalid transition from PostFundSetup: stateCount must increase by 1"
                );
                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "Invalid transition from PostFundSetup: resolutions must be equal"
                );
            } else {
                // PostFundSetup -> Conclude
                require(
                    _toState.isConclude(),
                    "Invalid transition from PostFundSetup: stateType must be Conclude"
                );
                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "Invalid transition from PostFundSetup: resolutions must be equal"
                );
            }
        }
        return true;
    }

    function validTransitionFromGame(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        if (_toState.isGame()) {
            require(
                validGameTransition(_fromState, _toState),
                "Invalid transition from Game: transition must be valid"
            );
        } else {
            require(
                _toState.isConclude(),
                "Invalid transition from Game: stateType must be Conclude"
            );
            require(
                State.resolutionsEqual(_fromState, _toState),
                "Invalid transition from Game: resolutions must be equal"
            );
        }
        return true;
    }

    function validTransitionFromConclude(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        require(
            _toState.isConclude(),
            "Invalid transition from Conclude: stateType must be Conclude"
        );
        require(
            State.resolutionsEqual(_fromState, _toState),
            "Invalid transition from Conclude: resolutions must be equal"
        );
        return true;
    }

    function validGameTransition(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        return true;
        // return ForceMoveGame(_fromState.channelType).validTransition(_fromState.gameAttributes, _toState.gameAttributes);
    }
}
