pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';

/**
  * @dev The RockPaperScissors contract complies with the ForceMoveApp interface and implements a commit-reveal game of Rock Paper Scissors (henceforth RPS).
*/
contract RockPaperScissors is ForceMoveApp {
    enum PositionType {Start, RoundProposed, RoundAccepted, Reveal}
    enum Weapon {Rock, Paper, Scissors}

    struct RPSData {
        PositionType positionType;
        uint256 stake;
        bytes32 preCommit;
        Weapon playerAWeapon;
        Weapon playerBWeapon;
        bytes32 salt;
    }

    /**
    * @notice Decodes the appData.
    * @dev Decodes the appData.
    * @param toGameDataBytes The abi.encode of a RPSData struct describing the application-specific data.
    * @return An RPSData struct containing the application-specific data.
    */
    function appData(bytes memory toGameDataBytes) internal pure returns (RPSData memory) {
        return abi.decode(toGameDataBytes, (RPSData));
    }

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