pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '../interfaces/ForceMoveApp.sol';
import '../Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

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
    using SafeMath for uint256;

    enum PositionType {Start, RoundProposed, RoundAccepted, Reveal}
    enum Weapon {Rock, Paper, Scissors}

    struct RPSData {
        PositionType positionType;
        uint256 stake;
        bytes32 preCommit;
        Weapon playerFirstWeapon;
        Weapon playerSecondWeapon;
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
    * @param fromPart State being transitioned from.
    * @param toPart State being transitioned to.
    * @param turnNumB Turn number being transitioned to.
    * @param nParticipants Number of participants in this state channel.
    * @return true if the transition conforms to the rules, false otherwise.
    */
    function validTransition(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        uint256 turnNumB,
        uint256 nParticipants
    ) public pure returns (bool) {
        // decode application-specific data
        RPSData memory fromGameData = appData(fromPart.appData);
        RPSData memory toGameData = appData(toPart.appData);

        // deduce action
        if (fromGameData.positionType == PositionType.Start) {
            require(
                toGameData.positionType == PositionType.RoundProposed,
                'Start may only transition to RoundProposed'
            );
            requireValidPROPOSE(fromPart, toPart, fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.RoundProposed) {
            if (toGameData.positionType == PositionType.Start) {
                requireValidREJECT(fromPart, toPart, fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.RoundAccepted) {
                requireValidACCEPT(fromPart, toPart, fromGameData, toGameData);
                return true;
            }
            revert('Proposed may only transition to Start or RoundAccepted');
        } else if (fromGameData.positionType == PositionType.RoundAccepted) {
            require(
                toGameData.positionType == PositionType.Reveal,
                'RoundAccepted may only transition to Reveal'
            );
            requireValidREVEAL(fromPart, toPart, fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.Reveal) {
            require(
                toGameData.positionType == PositionType.Start,
                'Reveal may only transition to Start'
            );
            requireValidFINISH(fromPart, toPart, fromGameData, toGameData);
            return true;
        }
        revert('No valid transition found');
    }

    // action requirements

    function requireValidPROPOSE(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        RPSData memory fromGameData,
        RPSData memory toGameData
    )
        private
        pure
        outcomeUnchanged(fromPart, toPart)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromPart, toPart, fromGameData, toGameData)
    {}

    function requireValidREJECT(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure {
        // TODO
    }

    function requireValidACCEPT(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure {
        // TODO
    }

    function requireValidREVEAL(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure {
        uint256 playerFirstWinnings;
        uint256 playerSecondWinnings;
        require(
            toGameData.playerSecondWeapon == fromGameData.playerSecondWeapon,
            "Player Second's weapon should be the same between commitments."
        );

        // check hash matches
        // need to convert Weapon -> uint256 to get hash to work
        bytes32 hashed = keccak256(
            abi.encodePacked(uint256(toGameData.playerFirstWeapon), toGameData.salt)
        );
        require(hashed == fromGameData.preCommit, 'The hash needs to match the precommit');

        // calculate winnings
        (playerFirstWinnings, playerSecondWinnings) = winnings(
            toGameData.playerFirstWeapon,
            toGameData.playerSecondWeapon,
            toGameData.stake
        );

        Outcome.OutcomeItem[] memory outcomeFrom = abi.decode(fromPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeTo = abi.decode(toPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory assetOutcomeFrom = abi.decode(
            outcomeFrom[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AssetOutcome memory assetOutcomeTo = abi.decode(
            outcomeTo[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AllocationItem[] memory allocationFrom = abi.decode(
            assetOutcomeFrom.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory allocationTo = abi.decode(
            assetOutcomeTo.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        require(
            allocationTo[0].amount == allocationFrom[0].amount.add(playerFirstWinnings),
            "Player First's allocation should be updated with the winnings."
        );
        require(
            allocationTo[1].amount ==
                allocationFrom[1].amount.sub(fromGameData.stake.mul(2)).add(playerSecondWinnings),
            "Player Second's allocation should be updated with the winnings."
        );
    }

    function requireValidFINISH(
        VariablePart memory a,
        VariablePart memory b,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure {
        // TODO
    }

    function winnings(
        Weapon playerFirstWeapon,
        Weapon playerSecondWeapon,
        uint256 stake
    ) private pure returns (uint256, uint256) {
        if (playerFirstWeapon == playerSecondWeapon) {
            return (stake, stake);
        } else if (
            (playerFirstWeapon == Weapon.Rock && playerSecondWeapon == Weapon.Scissors) ||
            (playerFirstWeapon > playerSecondWeapon)
        ) {
            // first player won
            return (2 * stake, 0);
        } else {
            // second player won
            return (0, 2 * stake);
        }
    }

    // modifiers
    modifier outcomeUnchanged(VariablePart memory a, VariablePart memory b) {
        require(
            keccak256(b.outcome) == keccak256(a.outcome),
            'RockPaperScissors: Outcome must not change'
        );
        _;
    }

    modifier stakeUnchanged(RPSData memory fromGameData, RPSData memory toGameData) {
        require(
            fromGameData.stake == toGameData.stake,
            'The stake should be the same between commitments'
        );
        _;
    }

    modifier allocationsNotLessThanStake(
        VariablePart memory a,
        VariablePart memory b,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) {
        // TODO need to compare the stake (currently uint256 and should probably indicate an asset type) to the outcome (bytes and needs to be decoded)
        _;
    }

}
