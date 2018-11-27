pragma experimental ABIEncoderV2;

import "./StateV2.sol";

contract RulesV2 is StateV2 {
    struct Challenge {
        bytes32 channelId;
        StateV2.StateStruct state;
        uint32 expirationTime;
        uint256[] payouts;
    }

    function validForceMove(
        StateV2.StateStruct memory _fromState,
        StateV2.StateStruct memory _toState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        // states must be signed by the appropriate participant
        requireSignature(_fromState, v[0], r[0], s[0]);
        StateV2.requireSignature(_toState, v[1], r[1], s[1]);

        return validTransition(_fromState, _toState);
    }

    function validConclusionProof(
        StateV2.StateStruct memory _fromState,
        StateV2.StateStruct memory _toState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        // states must be signed by the appropriate participant
        StateV2.requireSignature(_fromState, v[0], r[0], s[0]);
        StateV2.requireSignature(_toState, v[1], r[1], s[1]);

        // first move must be a concluded state (transition rules will ensure this for the other states)
        require(
            _fromState.stateType == StateV2.StateType.Conclude,
            "fromState must be Conclude"
        );
        // must be a valid transition
        return validTransition(_fromState, _toState);
    }

    function validRefute(
        StateV2.StateStruct memory _challengeState,
        StateV2.StateStruct memory _refutationState,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        require(
            _refutationState.turnNum > _challengeState.turnNum,
            "the refutationState must have a higher nonce"
        );
        require(
            StateV2.mover(_refutationState) == StateV2.mover(_challengeState),
            "refutationState must have same mover as challengeState"
        );
        // ... and be signed (by that mover)
        StateV2.requireSignature(_refutationState, v, r, s);

        return true;
    }

    function validRespondWithMove(
        StateV2.StateStruct memory _challengeState,
        StateV2.StateStruct memory _nextState,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        // check that the challengee's signature matches
        StateV2.requireSignature(_nextState, v, r, s);

        require(
            validTransition(_challengeState, _nextState),
            "must be a valid transition"
        );

        return true;
    }

    function validAlternativeRespondWithMove(
        StateV2.StateStruct memory _challengeState,
        StateV2.StateStruct memory _alternativeState,
        StateV2.StateStruct memory _nextState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {

        // checking the alternative state:
        require(
            StateV2.channelId(_challengeState) == StateV2.channelId(_alternativeState),
            "alternativeState must have the right channel"
        );
        require(
            _challengeState.turnNum == _alternativeState.turnNum,
            "alternativeState must have the same nonce as the challenge state"
        );
        // .. it must be signed (by the challenger)
        StateV2.requireSignature(_alternativeState, v[0], r[0], s[0]);

        // checking the nextState:
        // .. it must be signed (my the challengee)
        StateV2.requireSignature(_nextState, v[1], r[1], s[1]);
        require(
            validTransition(_alternativeState, _nextState),
            "it must be a valid transition of the gamestate (from the alternative state)"
        );

        return true;
    }

    function validTransition(
        StateV2.StateStruct memory  _fromState,
        StateV2.StateStruct memory _toState
    ) public pure returns (bool) {
        require(
            StateV2.channelId(_toState) == StateV2.channelId(_fromState),
            "channelId must match on toState"
        );
        require(
            _toState.turnNum == _fromState.turnNum + 1,
            "turnNum must increase by 1"
        );

        if (_fromState.stateType == StateV2.StateType.PreFundSetup) {
            return validTransitionFromPreFundSetup(_fromState, _toState);
        } else if (_fromState.stateType == StateV2.StateType.PostFundSetup) {
            return validTransitionFromPostFundSetup(_fromState, _toState);
        } else if (_fromState.stateType == StateV2.StateType.Game) {
            return validTransitionFromGame(_fromState, _toState);
        } else if (_fromState.stateType == StateV2.StateType.Conclude) {
            return validTransitionFromConclude(_fromState, _toState);
        }

        return true;
    }

    function validTransitionFromPreFundSetup(
        StateV2.StateStruct memory _fromState,
        StateV2.StateStruct memory _toState
    ) public pure returns (bool) {
        if (_fromState.stateCount == _fromState.numberOfParticipants - 1) {
            // there are two options from the final PreFundSetup state
            // 1. PreFundSetup -> PostFundSetup transition
            // 2. PreFundSetup -> Conclude transition
            if (_toState.stateType == StateV2.StateType.PostFundSetup) {
                require(
                    _toState.stateCount == 0,
                    "stateCount must be reset when transitioning to PostFundSetup"
                );
                require(
                    StateV2.gameAttributesEqual(_fromState, _toState),
                    "gameAttributes must be equal"
                );
                require(
                    StateV2.resolutionsEqual(_fromState, _toState),
                    "resolutions must be equal"
                );
            } else {
                require(
                    _toState.stateType == StateV2.StateType.Conclude,
                    "stateType must be conclude"
                );
                require(
                    StateV2.resolutionsEqual(_fromState, _toState),
                    "resolutions must equal"
                );
            }
        } else {
            // PreFundSetup -> PreFundSetup transition
            require(
                _toState.stateType == StateV2.StateType.PreFundSetup,
                "stateType must be PreFundSetup"
            );
            require(
                StateV2.gameAttributesEqual(_fromState, _toState),
                "gameAttributes must be equal"
            );
            require(
                _toState.stateCount == _fromState.stateCount + 1,
                "stateCount must increase by 1"
            );
            require(
                StateV2.resolutionsEqual(_fromState, _toState),
                "resolutions must equal"
            );
        }
        return true;
    }

    function validTransitionFromPostFundSetup(
        StateV2.StateStruct memory  _fromState,
        StateV2.StateStruct memory _toState
    ) public pure returns (bool) {
        if (_fromState.stateCount == _fromState.numberOfParticipants - 1) {
            // PostFundSetup -> Game transition is the only option
            require(
                _toState.stateType == StateV2.StateType.Game,
                "stateType must be Game"
            );
            require(
                validGameTransition(_fromState, _toState),
                "transition must be valid"
            );
        } else {
            // Two possibilities:
            // 1. PostFundSetup -> PostFundSetup transition
            // 2. PostFundSetup -> Conclude transition
            if (_toState.stateType == StateV2.StateType.PostFundSetup) {
                // PostFundSetup -> PostFundSetup
                require(
                    StateV2.gameAttributesEqual(_fromState, _toState),
                    "gameAttributes must be equal"
                );
                require(
                    _toState.stateCount == _fromState.stateCount + 1,
                    "stateCount must increase by 1"
                );
                require(
                    StateV2.resolutionsEqual(_fromState, _toState),
                    "resolutions must equal"
                );
            } else {
                // PostFundSetup -> Conclude
                require(
                    _toState.stateType == StateV2.StateType.Conclude,
                    "stateType must be conclude"
                );
                require(
                    StateV2.resolutionsEqual(_fromState, _toState),
                    "resolutions must equal"
                );
            }
        }
        return true;
    }

    function validTransitionFromGame(
        StateV2.StateStruct memory _fromState,
        StateV2.StateStruct memory _toState
    ) public pure returns (bool) {
        if (_toState.stateType == StateV2.StateType.Game) {
            require(
                validGameTransition(_fromState, _toState),
                "transition must be valid"
            );
        } else {
            require(
                _toState.stateType == StateV2.StateType.Conclude,
                "stateType must be conclude"
            );
            require(
                StateV2.resolutionsEqual(_fromState, _toState),
                "resolutions must equal"
            );
        }
        return true;
    }

    function validTransitionFromConclude(
        StateV2.StateStruct memory _fromState,
        StateV2.StateStruct memory _toState
    ) public pure returns (bool) {
        require(
            _toState.stateType == StateV2.StateType.Conclude,
            "stateType must be conclude"
        );
        require(
            StateV2.resolutionsEqual(_fromState, _toState),
            "resolutions must equal"
        );
        return true;
    }

    function validGameTransition(
        StateV2.StateStruct memory _fromState,
        StateV2.StateStruct memory _toState
    ) public pure returns (bool);
}
