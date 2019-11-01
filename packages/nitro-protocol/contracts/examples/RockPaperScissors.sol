pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '../interfaces/ForceMoveApp.sol';
import '../Outcome.sol';

/**
  * @dev The RockPaperScissors contract complies with the ForceMoveApp interface and implements a commit-reveal game of Rock Paper Scissors (henceforth RPS).
  * The following transitions are allowed:
  *
  * Start -> RoundProposed  [ PROPOSE ]
  * RoundProposed -> Start  [ REJECT ]
  * RoundProposed -> RoundAccepted [ ACCEPT ]
  * RoundAccepted -> Reveal [ REVEAL ]
  * Reveal -> Start [ FINISH ]
  *
*/
contract RockPaperScissors is ForceMoveApp {

    enum PositionType { Start, RoundProposed, RoundAccepted, Reveal }
    enum Weapon { Rock, Paper, Scissors }

    struct RPSData{
        PositionType positionType;
        uint256 stake;
        bytes32 preCommit;
        Weapon bWeapon;
        Weapon aWeapon;
        bytes32 salt;
    }

    /**
    * @notice Deocdes the appData.
    * @dev Deocdes the appData.
    * @param appDataBytes The abi.encode of a RPSData struct describing the application-specific data.
    * @return An RPSData struct containing the application-specific data.
    */
    function appData(bytes memory appDataBytes) internal pure returns (RPSData memory) {
        return abi.decode(appDataBytes, (RPSData));
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

        // decode application-specific data
        RPSData memory appDataA = appData(a.appData);
        RPSData memory appDataB = appData(b.appData);

        // deduce action
        if (appDataA.positionType == PositionType.Start) {
            require(appDataB.positionType == PositionType.RoundProposed, 'Start may only transition to RoundProposed');
            validPROPOSE();
            return true;
        }
        if (appDataA.positionType == PositionType.RoundProposed) {
            if (appDataB.positionType == PositionType.Start) {
                validREJECT();
                return true;
            }
            if (appDataB.positionType == PositionType.RoundAccepted) {
                validACCEPT();
                return true;
            }
        revert('Proposed may only transition to Start or RoundAccepted');
        }
        if (appDataA.positionType == PositionType.Reveal) {
            require(appDataB.positionType == PositionType.Start, 'Reveal may only transition to Start');
            validFINISH();
            return true;
        }
        revert('No valid transition found');
    }

    function validPROPOSE() private pure returns (bool) {return true;}
    function validREJECT() private pure returns (bool) {return true;}
    function validACCEPT() private pure returns (bool) {return true;}
    function validFINISH() private pure returns (bool) {return true;}
}