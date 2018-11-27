pragma solidity ^0.5.0;

import "./State.sol";
import "./ForceMoveGame.sol";

library Rules {
    using State for bytes;

    struct Challenge {
        bytes32 channelId;
        bytes state;
        uint32 expirationTime;
        uint256[] payouts;
    }

    function validForceMove(
        bytes _fromState,
        bytes _toState,
        uint8[] v,
        bytes32[] r,
        bytes32[] s
    ) public pure returns (bool) {
        // states must be signed by the appropriate participant
        _fromState.requireSignature(v[0], r[0], s[0]);
        _toState.requireSignature(v[1], r[1], s[1]);

        return validTransition(_fromState, _toState);
    }

    function validConclusionProof(
        bytes _fromState,
        bytes _toState,
        uint8[] v,
        bytes32[] r,
        bytes32[] s
    ) public pure returns (bool) {
        // states must be signed by the appropriate participant
        _fromState.requireSignature(v[0], r[0], s[0]);
        _toState.requireSignature(v[1], r[1], s[1]);

        // first move must be a concluded state (transition rules will ensure this for the other states)
        require(_fromState.stateType() == State.StateType.Conclude);
        // must be a valid transition
        return validTransition(_fromState, _toState);
    }

    function validRefute(
        bytes _challengeState,
        bytes _refutationState,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        // the refutationState must have a higher nonce
        require(_refutationState.turnNum() > _challengeState.turnNum());
        // ... with the same mover
        require(_refutationState.mover() == _challengeState.mover());
        // ... and be signed (by that mover)
        _refutationState.requireSignature(v, r, s);

        return true;
    }

    function validRespondWithMove(
        bytes _challengeState,
        bytes _nextState,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        // check that the challengee's signature matches
        _nextState.requireSignature(v, r, s);

        require(validTransition(_challengeState, _nextState));

        return true;
    }

    function validAlternativeRespondWithMove(
        bytes _challengeState,
        bytes _alternativeState,
        bytes _nextState,
        uint8[] v,
        bytes32[] r,
        bytes32[] s
    ) public pure returns (bool) {

        // checking the alternative state:
        // .. it must have the right channel
        require(_challengeState.channelId() == _alternativeState.channelId());
        // .. it must have the same nonce as the challenge state
        require(_challengeState.turnNum() == _alternativeState.turnNum());
        // .. it must be signed (by the challenger)
        _alternativeState.requireSignature(v[0], r[0], s[0]);

        // checking the nextState:
        // .. it must be signed (my the challengee)
        _nextState.requireSignature(v[1], r[1], s[1]);
        // .. it must be a valid transition of the gamestate (from the alternative state)
        require(validTransition(_alternativeState, _nextState));

        return true;
    }

    function validTransition(bytes _fromState, bytes _toState) public pure returns (bool) {
        require(_toState.channelId() == _fromState.channelId());
        require(_toState.turnNum() == _fromState.turnNum() + 1);

        if (_fromState.stateType() == State.StateType.PreFundSetup) {
            return validTransitionFromPreFundSetup(_fromState, _toState);
        } else if (_fromState.stateType() == State.StateType.PostFundSetup) {
            return validTransitionFromPostFundSetup(_fromState, _toState);
        } else if (_fromState.stateType() == State.StateType.Game) {
            return validTransitionFromGame(_fromState, _toState);
        } else if (_fromState.stateType() == State.StateType.Conclude) {
            return validTransitionFromConclude(_fromState, _toState);
        }

        return true;
    }

    function validTransitionFromPreFundSetup(bytes _fromState, bytes _toState) public pure returns (bool) {
        if (_fromState.stateCount() == _fromState.numberOfParticipants() - 1) {
            // there are two options from the final PreFundSetup state
            // 1. PreFundSetup -> PostFundSetup transition
            // 2. PreFundSetup -> Conclude transition
            if (_toState.stateType() == State.StateType.PostFundSetup) {
                require(_toState.stateCount() == 0); // reset the stateCount
                require(State.gameAttributesEqual(_fromState, _toState));
                require(State.resolutionsEqual(_fromState, _toState));
            } else {
                require(_toState.stateType() == State.StateType.Conclude);
                require(State.resolutionsEqual(_fromState, _toState));
            }
        } else {
            // PreFundSetup -> PreFundSetup transition
            require(_toState.stateType() == State.StateType.PreFundSetup);
            require(State.gameAttributesEqual(_fromState, _toState));
            require(_toState.stateCount() == _fromState.stateCount() + 1);
            require(State.resolutionsEqual(_fromState, _toState));
        }
        return true;
    }

    function validTransitionFromPostFundSetup(bytes _fromState, bytes _toState) public pure returns (bool) {
        if (_fromState.stateCount() == _fromState.numberOfParticipants() - 1) {
            // PostFundSetup -> Game transition is the only option
            require(_toState.stateType() == State.StateType.Game);
            require(ForceMoveGame(_fromState.channelType()).validTransition(_fromState, _toState));
        } else {
            // Two possibilities:
            // 1. PostFundSetup -> PostFundSetup transition
            // 2. PostFundSetup -> Conclude transition
            if (_toState.stateType() == State.StateType.PostFundSetup) {
                // PostFundSetup -> PostFundSetup
                require(State.gameAttributesEqual(_fromState, _toState));
                require(_toState.stateCount() == _fromState.stateCount() + 1);
                require(State.resolutionsEqual(_fromState, _toState));
            } else {
                // PostFundSetup -> Conclude
                require(_toState.stateType() == State.StateType.Conclude);
                require(State.resolutionsEqual(_fromState, _toState));
            }
        }
        return true;
    }

    function validTransitionFromGame(bytes _fromState, bytes _toState) public pure returns (bool) {
        if (_toState.stateType() == State.StateType.Game) {
            require(ForceMoveGame(_fromState.channelType()).validTransition(_fromState, _toState));
        } else {
            require(_toState.stateType() == State.StateType.Conclude);
            require(State.resolutionsEqual(_fromState, _toState));
        }
        return true;
    }

    function validTransitionFromConclude(bytes _fromState, bytes _toState) public pure returns (bool) {
        require(_toState.stateType() == State.StateType.Conclude);
        require(State.resolutionsEqual(_fromState, _toState));
        return true;
    }
}
