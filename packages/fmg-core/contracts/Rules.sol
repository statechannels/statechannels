pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./State.sol";

contract Rules is State {
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
        requireSignature(_fromState, v[0], r[0], s[0]);
        State.requireSignature(_toState, v[1], r[1], s[1]);

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
        State.requireSignature(_fromState, v[0], r[0], s[0]);
        State.requireSignature(_toState, v[1], r[1], s[1]);

        // first move must be a concluded state (transition rules will ensure this for the other states)
        require(
            _fromState.stateType == State.StateType.Conclude,
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
            State.mover(_refutationState) == State.mover(_challengeState),
            "refutationState must have same mover as challengeState"
        );
        // ... and be signed (by that mover)
        State.requireSignature(_refutationState, v, r, s);

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
        State.requireSignature(_nextState, v, r, s);

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
            State.channelId(_challengeState) == State.channelId(_alternativeState),
            "alternativeState must have the right channel"
        );
        require(
            _challengeState.turnNum == _alternativeState.turnNum,
            "alternativeState must have the same nonce as the challenge state"
        );
        // .. it must be signed (by the challenger)
        State.requireSignature(_alternativeState, v[0], r[0], s[0]);

        // checking the nextState:
        // .. it must be signed (my the challengee)
        State.requireSignature(_nextState, v[1], r[1], s[1]);
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
            State.channelId(_toState) == State.channelId(_fromState),
            "channelId must match on toState"
        );
        require(
            _toState.turnNum == _fromState.turnNum + 1,
            "turnNum must increase by 1"
        );

        if (_fromState.stateType == State.StateType.PreFundSetup) {
            return validTransitionFromPreFundSetup(_fromState, _toState);
        } else if (_fromState.stateType == State.StateType.PostFundSetup) {
            return validTransitionFromPostFundSetup(_fromState, _toState);
        } else if (_fromState.stateType == State.StateType.Game) {
            return validTransitionFromGame(_fromState, _toState);
        } else if (_fromState.stateType == State.StateType.Conclude) {
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
            if (_toState.stateType == State.StateType.PostFundSetup) {
                require(
                    _toState.stateCount == 0,
                    "stateCount must be reset when transitioning to PostFundSetup"
                );
                require(
                    State.gameAttributesEqual(_fromState, _toState),
                    "gameAttributes must be equal"
                );
                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "resolutions must be equal"
                );
            } else {
                require(
                    _toState.stateType == State.StateType.Conclude,
                    "stateType must be conclude"
                );
                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "resolutions must equal"
                );
            }
        } else {
            // PreFundSetup -> PreFundSetup transition
            require(
                _toState.stateType == State.StateType.PreFundSetup,
                "stateType must be PreFundSetup"
            );
            require(
                State.gameAttributesEqual(_fromState, _toState),
                "gameAttributes must be equal"
            );
            require(
                _toState.stateCount == _fromState.stateCount + 1,
                "stateCount must increase by 1"
            );
            require(
                State.resolutionsEqual(_fromState, _toState),
                "resolutions must equal"
            );
        }
        return true;
    }

    function validTransitionFromPostFundSetup(
        State.StateStruct memory  _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        if (_fromState.stateCount == _fromState.numberOfParticipants - 1) {
            // PostFundSetup -> Game transition is the only option
            require(
                _toState.stateType == State.StateType.Game,
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
            if (_toState.stateType == State.StateType.PostFundSetup) {
                // PostFundSetup -> PostFundSetup
                require(
                    State.gameAttributesEqual(_fromState, _toState),
                    "gameAttributes must be equal"
                );
                require(
                    _toState.stateCount == _fromState.stateCount + 1,
                    "stateCount must increase by 1"
                );
                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "resolutions must equal"
                );
            } else {
                // PostFundSetup -> Conclude
                require(
                    _toState.stateType == State.StateType.Conclude,
                    "stateType must be conclude"
                );
                require(
                    State.resolutionsEqual(_fromState, _toState),
                    "resolutions must equal"
                );
            }
        }
        return true;
    }

    function validTransitionFromGame(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        if (_toState.stateType == State.StateType.Game) {
            require(
                validGameTransition(_fromState, _toState),
                "transition must be valid"
            );
        } else {
            require(
                _toState.stateType == State.StateType.Conclude,
                "stateType must be conclude"
            );
            require(
                State.resolutionsEqual(_fromState, _toState),
                "resolutions must equal"
            );
        }
        return true;
    }

    function validTransitionFromConclude(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        require(
            _toState.stateType == State.StateType.Conclude,
            "stateType must be conclude"
        );
        require(
            State.resolutionsEqual(_fromState, _toState),
            "resolutions must equal"
        );
        return true;
    }

    function validGameTransition(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool);
}
