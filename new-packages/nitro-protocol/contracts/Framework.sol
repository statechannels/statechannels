pragma solidity ^0.4.23;

import "./CommonState.sol";
import "./ForceMoveGame.sol";

library Framework {
    using CommonState for bytes;

    struct Challenge {
        bytes32 channelId;
        bytes state;
        uint256[2] resolvedBalances;
        uint32 expirationTime;
    }

    function validTransition(bytes _fromState, bytes _toState) public pure returns (bool) {
        require(_toState.channelId() == _fromState.channelId());
        require(_toState.turnNum()  == _fromState.turnNum() + 1);

        if (_fromState.stateType() == CommonState.StateType.Propose) {
            if (_fromState.stateCount() == _fromState.numberOfParticipants()) {
                // if we're in the final Propose state there are two options:
                // 1. Propose -> Accept transition
                // 2. Propose -> Conclude transition
                if (_toState.stateType() == CommonState.StateType.Accept) {
                    require(_toState.stateCount() == 0); // reset the stateCount
                    /* require(_toState.position() == _fromState.position()); */
                    /* require(_toState.balances() == _fromState.balances(); */
                } else {
                    require(_toState.stateType() == CommonState.StateType.Conclude);
                    /* require(_toState.balances() == _fromState.balances(); */
                }
            } else {
                // Propose -> Propose transition
                require(_toState.stateType() == CommonState.StateType.Propose);
                /* require(_toState.position() == _fromState.position()); */
                require(_toState.stateCount() == _fromState.stateCount() + 1);
                /* require(_toState.balances() == _fromState.balances(); */
            }
        } else if (_fromState.stateType() == CommonState.StateType.Accept) {
            if (_fromState.stateCount() == _fromState.numberOfParticipants()) {
                // Accept -> Game transition is the only option
                require(_toState.stateType() == CommonState.StateType.Game);
                /* require(_toState.position() == _fromState.position()); */
                /* ForceMoveGame(_fromState.channelType()).validStart(_fromState.balances(), _toState); */
            } else {
                // Two possibilities:
                // 1. Accept -> Accept transition
                // 2. Accept -> Conclude transition
                if (_toState.stateType() == CommonState.StateType.Accept) {
                    // Accept -> Accept
                    /* require(_toState.position() == _fromState.position()); */
                    require(_toState.stateCount() == _fromState.stateCount() + 1);
                    /* require(_toState.balances() == _fromState.balances(); */
                } else {
                    // Accept -> Conclude
                    require(_toState.stateType() == CommonState.StateType.Conclude);
                    /* require(_toState.balances() == _fromState.balances(); */
                }
            }
        } else if (_fromState.stateType() == CommonState.StateType.Game) {
            if (_toState.stateType() == CommonState.StateType.Game) {
                require(ForceMoveGame(_fromState.channelType()).validTransition(_fromState, _toState));
            } else {
                require(_toState.stateType() == CommonState.StateType.Conclude);
                /* require(ForceMoveGame(_fromState.channelType()).validConclusion(_fromState, _toState.balances())); */
            }
        } else if (_fromState.stateType() == CommonState.StateType.Conclude) {
            require(_toState.stateType() == CommonState.StateType.Conclude);
            /* require(_toState.balances() == _fromState.balances()); */
        }

        return true;
    }

}