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
            requireValidPROPOSE(a,b, appDataA, appDataB);
            return true;
        }
        if (appDataA.positionType == PositionType.RoundProposed) {
            if (appDataB.positionType == PositionType.Start) {
                requireValidREJECT(a,b, appDataA, appDataB);
                return true;
            }
            if (appDataB.positionType == PositionType.RoundAccepted) {
                requireValidACCEPT(a,b, appDataA, appDataB);
                return true;
            }
        revert('Proposed may only transition to Start or RoundAccepted');
        }
        if (appDataA.positionType == PositionType.Reveal) {
            require(appDataB.positionType == PositionType.Start, 'Reveal may only transition to Start');
            requireValidFINISH(a,b, appDataA, appDataB);
            return true;
        }
        revert('No valid transition found');
    }

    // action requirements

    function requireValidPROPOSE(
        VariablePart memory a,
        VariablePart memory b,
        RPSData memory appDataA,
        RPSData memory appDataB
        ) private pure
        outcomeUnchanged(a,b)
        stakeUnchanged(appDataA, appDataB)
        allocationsNotLessThanStake(a, b, appDataA, appDataB)
        {
        }

    function requireValidREJECT(
        VariablePart memory a,
        VariablePart memory b,
        RPSData memory appDataA,
        RPSData memory appDataB
        ) private pure  {
            // TODO
        }

    function requireValidACCEPT(
        VariablePart memory a,
        VariablePart memory b,
        RPSData memory appDataA,
        RPSData memory appDataB
        ) private pure
        {
            // TODO
        }

    function requireValidFINISH(
        VariablePart memory a,
        VariablePart memory b,
        RPSData memory appDataA,
        RPSData memory appDataB
        ) private pure 
        {
            // TODO
        }

    // modifiers

    modifier outcomeUnchanged(
        VariablePart memory a,
        VariablePart memory b
        ) {
        require(
            keccak256(b.outcome) == keccak256(a.outcome),
            'RockPaperScissors: Outcome must not change'
        );
        _;
    }

    modifier stakeUnchanged(
        RPSData memory appDataA,
        RPSData memory appDataB
        ) {
        require(appDataA.stake == appDataB.stake, "The stake should be the same between commitments");
        _;
    }

    modifier allocationsNotLessThanStake(
        VariablePart memory a,
        VariablePart memory b,
        RPSData memory appDataA,
        RPSData memory appDataB
        ) {
            // TODO need to compare the stake (currently uint256 and should probably indicate an asset type) to the outcome (bytes and needs to be decoded)
        _;
    }

}