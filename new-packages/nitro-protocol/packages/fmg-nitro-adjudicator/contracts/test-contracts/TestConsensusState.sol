pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/State.sol";
import "../ConsensusState.sol";

contract TestConsensusState {
    using State for State.StateStruct;
    using ConsensusState for ConsensusState.ConsensusStateStruct;

    function fromFrameworkState(State.StateStruct memory frameworkState) public pure returns (ConsensusState.ConsensusStateStruct memory) {
        return ConsensusState.fromFrameworkState(frameworkState);
    }

    function gameAttributes(State.StateStruct memory frameworkState) public pure returns (ConsensusState.GameAttributes memory) {
        return ConsensusState.gameAttributes(frameworkState);
    }
}
