pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '../interfaces/ForceMoveApp.sol';
import '../Outcome.sol';

/**
  * @dev The RockPaperScissors contract complies with the ForceMoveApp interface and implements a commit-reveal game of Rock Paper Scissors (henceforth RPS).
*/
contract RockPaperScissors is ForceMoveApp {

    /**
    * @notice Encodes the RPS update rules.
    * @dev Encodes the RPS update rules.
    * @param a State being transitioned from.
    * @param b State being transitioned to.
    * @param turnNumB Turn number being transitioned to.
    * @param nParticipants Number of participants in this state channel.
    * @return true if the transition conforms to the rules, false otherwise.
    */
    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint256 turnNumB,
        uint256 nParticipants
    ) public pure returns (bool) {
        return true;
    }
}
