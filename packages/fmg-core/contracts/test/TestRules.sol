pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../Rules.sol";
import "../State.sol";

contract TestRules {
    using State for State.StateStruct;

    function validForceMove(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        return Rules.validForceMove(_fromState, _toState, v, r, s);
    }

    function validConclusionProof(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        return Rules.validConclusionProof(_fromState, _toState, v, r, s);
    }

    function validRefute(
        State.StateStruct memory _challengeState,
        State.StateStruct memory _refutationState,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        return Rules.validRefute(_challengeState, _refutationState, v, r, s);
    }

    function validRespondWithMove(
        State.StateStruct memory _challengeState,
        State.StateStruct memory _nextState,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        return Rules.validRespondWithMove(_challengeState, _nextState, v, r, s);
    }

    function validAlternativeRespondWithMove(
        State.StateStruct memory _challengeState,
        State.StateStruct memory _alternativeState,
        State.StateStruct memory _nextState,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        return Rules.validAlternativeRespondWithMove(_challengeState, _alternativeState, _nextState, v, r, s);
    }

    function validTransition(
        State.StateStruct memory  _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        return Rules.validTransition(_fromState, _toState);
    }

    function validGameTransition(
        State.StateStruct memory _fromState,
        State.StateStruct memory _toState
    ) public pure returns (bool) {
        return true;
        // return ForceMoveGame(_fromState.channelType).validTransition(_fromState.gameAttributes, _toState.gameAttributes);
    }
}
