pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../State.sol";

contract TestState {
    using State for State.StateStruct;

    function isPreFundSetup(State.StateStruct memory _state) public pure returns (bool) {
        return _state.isPreFundSetup();
    }

    function isPostFundSetup(State.StateStruct memory _state) public pure returns (bool) {
        return _state.isPostFundSetup();
    }

    function isGame(State.StateStruct memory _state) public pure returns (bool) {
        return _state.isGame();
    }

    function isConclude(State.StateStruct memory _state) public pure returns (bool) {
        return _state.isConclude();
    }

    function channelId(State.StateStruct memory _state) public pure returns (bytes32) {
        return _state.channelId();
    }

    function mover(State.StateStruct memory _state) public pure returns (address) {
        return _state.mover();
    }

    function requireSignature(State.StateStruct memory _state, uint8 _v, bytes32 _r, bytes32 _s) public pure {
        return State.requireSignature(_state, _v, _r, _s);
    }

    function requireFullySigned(State.StateStruct memory _state, uint8[] memory _v, bytes32[] memory _r, bytes32[] memory _s) public pure {
        return State.requireFullySigned(_state, _v, _r, _s);
    }

    function gameAttributesEqual(State.StateStruct memory _state, State.StateStruct memory _otherState) public pure returns (bool) {
        return State.gameAttributesEqual(_state, _otherState);
    }

    function resolutionsEqual(State.StateStruct memory _state, State.StateStruct memory _otherState) public pure returns (bool) {
        return resolutionsEqual(_state, _otherState);
    }
}
