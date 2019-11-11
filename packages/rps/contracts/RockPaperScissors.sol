pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';
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
        Weapon aWeapon; // playerOneWeapon
        Weapon bWeapon; // playerTwoWeapon
        bytes32 salt;
    }

    /**
    * @notice Decodes the appData.
    * @dev Decodes the appData.
    * @param appDataBytes The abi.encode of a RPSData struct describing the application-specific data.
    * @return An RPSData struct containing the application-specific data.
    */
    function appData(bytes memory appDataBytes) internal pure returns (RPSData memory) {
        return abi.decode(appDataBytes, (RPSData));
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
    ) public pure destinationsUnchanged(fromPart, toPart) returns (bool) {
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
    ) private pure 
    allocationUnchanged(fromPart, toPart)
    stakeUnchanged(fromGameData, toGameData)
    { }

    function requireValidACCEPT(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure 
    stakeUnchanged(fromGameData, toGameData)
    {

    require(fromGameData.preCommit == toGameData.preCommit,"Precommit should be the same.");
        
    // TODO DRY: this code is used multiple times

        Outcome.OutcomeItem[] memory fromOutcome = abi.decode(fromPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory toOutcome = abi.decode(toPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory fromAssetOutcome = abi.decode(
            fromOutcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AssetOutcome memory toAssetOutcome = abi.decode(
            toOutcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AllocationItem[] memory fromAllocation = abi.decode(
            fromAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory toAllocation = abi.decode(
            toAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        // a will have to reveal, so remove the stake beforehand
        require(fromAllocation[0].amount == toAllocation[0].amount.sub(toGameData.stake), "Allocation for player A should be decremented by 1x stake");
        require(fromAllocation[1].amount == toAllocation[1].amount.sub(toGameData.stake), "Allocation for player B should be incremented by 1x stake.");

    }

    function requireValidREVEAL(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure {
        uint256 playerAWinnings; // playerOneWinnings
        uint256 playerBWinnings; // playerTwoWinnings
        require(
            toGameData.bWeapon == fromGameData.bWeapon,
            "Player Second's weapon should be the same between commitments."
        );

        // check hash matches
        // need to convert Weapon -> uint256 to get hash to work
        bytes32 hashed = keccak256(
            abi.encodePacked(uint256(toGameData.aWeapon), toGameData.salt)
        );
        require(hashed == fromGameData.preCommit, 'The hash needs to match the precommit');

        // calculate winnings
        (playerAWinnings, playerBWinnings) = winnings(
            toGameData.aWeapon,
            toGameData.bWeapon,
            toGameData.stake
        );

        Outcome.OutcomeItem[] memory fromOutcome = abi.decode(fromPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory toOutcome = abi.decode(toPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory fromAssetOutcome = abi.decode(
            fromOutcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AssetOutcome memory toAssetOutcome = abi.decode(
            toOutcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AllocationItem[] memory fromAllocation = abi.decode(
            fromAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory toAllocation = abi.decode(
            toAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(playerAWinnings),
            "Player First's allocation should be updated with the winnings."
        );
        require(
            toAllocation[1].amount ==
                fromAllocation[1].amount.sub(fromGameData.stake.mul(2)).add(playerBWinnings),
            "Player Second's allocation should be updated with the winnings."
        );
    }

    function requireValidFINISH(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure
    allocationUnchanged(fromPart, toPart)
    stakeUnchanged(fromGameData, toGameData)
    {  }

    function winnings(
        Weapon aWeapon,
        Weapon bWeapon,
        uint256 stake
    ) private pure returns (uint256, uint256) {
        if (aWeapon == bWeapon) {
            return (stake, stake);
        } else if (
            (aWeapon == Weapon.Rock && bWeapon == Weapon.Scissors) ||
            (aWeapon > bWeapon)
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
        VariablePart memory fromPart,
        VariablePart memory toPart,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) {
        // TODO should the stake (currently uint256) indicate an asset type? 

        Outcome.OutcomeItem[] memory fromOutcome = abi.decode(fromPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory toOutcome = abi.decode(toPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory fromAssetOutcome = abi.decode(
            fromOutcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AssetOutcome memory toAssetOutcome = abi.decode(
            toOutcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AllocationItem[] memory fromAllocation = abi.decode(
            fromAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory toAllocation = abi.decode(
            toAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        require(fromAllocation[0].amount >= toGameData.stake,"The allocation for player A must not fall below the stake.");
        require(fromAllocation[1].amount >= toGameData.stake ,"The allocation for player B must not fall below the stake.");
        _;
    }

    modifier allocationUnchanged(
        VariablePart memory fromPart,
        VariablePart memory toPart
    ) {
        Outcome.OutcomeItem[] memory fromOutcome = abi.decode(fromPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory toOutcome = abi.decode(toPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory fromAssetOutcome = abi.decode(fromOutcome[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AssetOutcome memory toAssetOutcome = abi.decode(toOutcome[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AllocationItem[] memory fromAllocation = abi.decode(
            fromAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory toAllocation = abi.decode(
            toAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        require(toAllocation[0].destination == fromAllocation[0].destination,'RockPaperScissors: Destimation playerA may not change');
        require(toAllocation[1].destination == fromAllocation[1].destination,'RockPaperScissors: Destimation playerB may not change');
        require(toAllocation[0].amount == fromAllocation[0].amount,'RockPaperScissors: Amount playerA may not change');
        require(toAllocation[1].amount == fromAllocation[1].amount,'RockPaperScissors: Amount playerB may not change');
        _;
    }

        modifier destinationsUnchanged(
        VariablePart memory fromPart,
        VariablePart memory toPart
    ) {
        Outcome.OutcomeItem[] memory fromOutcome = abi.decode(fromPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory toOutcome = abi.decode(toPart.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory fromAssetOutcome = abi.decode(fromOutcome[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AssetOutcome memory toAssetOutcome = abi.decode(toOutcome[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AllocationItem[] memory fromAllocation = abi.decode(
            fromAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory toAllocation = abi.decode(
            toAssetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        require(toAllocation[0].destination == fromAllocation[0].destination,'RockPaperScissors: Destimation playerA may not change');
        require(toAllocation[1].destination == fromAllocation[1].destination,'RockPaperScissors: Destimation playerB may not change');
        _;
    }

    // TODO modifiers below here are currently unused and possibly belong in a Library

    modifier oneAssetType(
        VariablePart memory a,
        VariablePart memory b
    ) {
        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));

        // Throws if more than one asset
        require(outcomeA.length == 1, 'RockPaperScissors: outcomeA: Only one asset allowed');
        require(outcomeB.length == 1, 'RockPaperScissors: outcomeB: Only one asset allowed');
        _;
    }

    modifier assetOutcomeIsAllocation(
        VariablePart memory a,
        VariablePart memory b
    ) {
        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));

        // Throws unless the assetOutcome is an allocation
        Outcome.AssetOutcome memory assetOutcomeA = abi.decode(outcomeA[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AssetOutcome memory assetOutcomeB = abi.decode(outcomeB[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        require(assetOutcomeA.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),'RockPaperScissors: outcomeA: AssetOutcomeType must be Allocation');
        require(assetOutcomeB.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),'RockPaperScissors: outcomeB: AssetOutcomeType must be Allocation');
        _;
    }

    modifier allocationLengthIsCorrect(
        VariablePart memory a,
        VariablePart memory b,
        uint256 nParticipants
    ) {
        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory assetOutcomeA = abi.decode(outcomeA[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AssetOutcome memory assetOutcomeB = abi.decode(outcomeB[0].assetOutcomeBytes, (Outcome.AssetOutcome));

        // Throws unless that allocation has exactly n outcomes
        Outcome.AllocationItem[] memory allocationA = abi.decode(
            assetOutcomeA.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory allocationB = abi.decode(
            assetOutcomeB.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        require(allocationA.length == nParticipants,'RockPaperScissors: outcomeA: Allocation length must equal number of participants');
        require(allocationB.length == nParticipants,'RockPaperScissors: outcomeB: Allocation length must equal number of participants');
        _;
    }
}
