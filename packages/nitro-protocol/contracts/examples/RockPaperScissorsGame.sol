pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '../interfaces/ForceMoveApp.sol';
import '../Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract RockPaperScissorsGame is ForceMoveApp {
    using SafeMath for uint256;
    // The following transitions are allowed:
    //
    // Start -> RoundProposed
    // RoundProposed -> Start // reject game
    // RoundProposed -> RoundAccepted
    // RoundAccepted -> Reveal
    // Reveal -> Start

    enum PositionType {Start, RoundProposed, RoundAccepted, Reveal}
    enum Weapon {Rock, Paper, Scissors}

    struct RockPaperScissorsGameData {
        PositionType positionType;
        bytes32 salt;
        Weapon playerSecondWeapon;
        Weapon playerFirstWeapon;
        bytes32 preCommit;
    }

    /**
    * @notice Decodes the appData.
    * @dev Decodes the appData.
    * @param appDataBytes The abi.encode of a RockPaperScissorsGameData struct describing the application-specific data.
    * @return A RockPaperScissorsGameData struct containing the application-specific data.
    */
    function appData(bytes memory appDataBytes)
        internal
        pure
        returns (RockPaperScissorsGameData memory)
    {
        return abi.decode(appDataBytes, (RockPaperScissorsGameData));
    }

    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint256, // turnNumB, unused
        uint256 // nParticipants, unused
    ) public pure outcomeUnchanged(a,b) returns (bool) {
        RockPaperScissorsGameData memory fromGameData = appData(a.appData);
        RockPaperScissorsGameData memory toGameData = appData(b.appData);

        if (fromGameData.positionType == PositionType.Start) {
            if (toGameData.positionType == PositionType.RoundProposed) {
                validateStartToRoundProposed(a, b);

                return true;
            }
        } else if (fromGameData.positionType == PositionType.RoundProposed) {
            if (toGameData.positionType == PositionType.Start) {
                // game rejected
                validateRoundProposedToRejected(a, b);

                return true;
            } else if (toGameData.positionType == PositionType.RoundAccepted) {
                validateRoundProposedToRoundAccepted(a, b);

                return true;
            }
        } else if (fromGameData.positionType == PositionType.RoundAccepted) {
            if (toGameData.positionType == PositionType.Reveal) {
                validateRoundAcceptedToReveal(a, b);

                return true;
            }
        } else if (fromGameData.positionType == PositionType.Reveal) {
            if (toGameData.positionType == PositionType.Start) {
                validateRevealToStart(a, b);

                return true;
            }
        }

        revert('No valid transition found for commitments');
    }

    function winnings(
        Weapon playerFirstWeapon,
        Weapon playerSecondWeapon,
        Outcome.AllocationItem[] allocationA,
        Outcome.AllocationItem[] allocationB
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

    modifier outcomeUnchanged(VariablePart memory a, VariablePart memory b) {
        require(keccak256(b.outcome) == keccak256(a.outcome), 'RockPaperScissorsGame: Outcome must not change');
    }

    modifier allocationUnchanged(
        VariablePart memory a,
        VariablePart memory b
    ) {
        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory assetOutcomeA = abi.decode(outcomeA[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AssetOutcome memory assetOutcomeB = abi.decode(outcomeB[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AllocationItem[] memory allocationA = abi.decode(
            assetOutcomeA.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory allocationB = abi.decode(
            assetOutcomeB.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        require(allocationB[0].destination == allocationA[0].destination,'RockPaperScissorsGame: Destimation playerFirst may not change');
        require(allocationB[1].destination == allocationA[1].destination,'RockPaperScissorsGame: Destimation playerSecond may not change');
        require(allocationB[0].amount == allocationA[0].amount,'RockPaperScissorsGame: Amount playerFirst may not change');
        require(allocationB[1].amount == allocationA[1].amount,'RockPaperScissorsGame: Amount playerSecond may not change');
        _;
    }

    modifier oneAssetType(
        VariablePart memory a,
        VariablePart memory b
    ) {
        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));

        // Throws if more than one asset
        require(outcomeA.length == 1, 'RockPaperScissorsGame: outcomeA: Only one asset allowed');
        require(outcomeB.length == 1, 'RockPaperScissorsGame: outcomeB: Only one asset allowed');
        _;
    }

    modifier assetOutcomeIsAllocation(
        VariablePart memory a,
        VariablePart memory b
    ) {
        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));

        // Throws unless the assetoutcome is an allocation
        Outcome.AssetOutcome memory assetOutcomeA = abi.decode(outcomeA[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AssetOutcome memory assetOutcomeB = abi.decode(outcomeB[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        require(assetOutcomeA.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),'RockPaperScissorsGame: outcomeA: AssetOutcomeType must be Allocation');
        require(assetOutcomeB.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),'RockPaperScissorsGame: outcomeB: AssetOutcomeType must be Allocation');
        _;
    }

    modifier allocationLengthIsCorrect(
        VariablePart memory a,
        VariablePart memory b
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
        require(allocationA.length == nParticipants,'RockPaperScissorsGame: outcomeA: Allocation length must equal number of participants');
        require(allocationB.length == nParticipants,'RockPaperScissorsGame: outcomeB: Allocation length must equal number of participants');
        _;
    }

    // transition validations
    function validateStartToRoundProposed(
        VariablePart memory a,
        VariablePart memory b
    )
        private
        pure
        allocationUnchanged(a, b)
    {
        // we should maybe require that aPreCommit isn't empty, but then it will only hurt a later if it is
    }

    function validateStartToConcluded(
        VariablePart memory a,
        VariablePart memory b
    ) private pure allocationUnchanged(a, b) {}

    function validateRoundProposedToRejected(
        VariablePart memory a,
        VariablePart memory b
    ) private pure allocationUnchanged(a, b) {}

    function validateRoundProposedToRoundAccepted(
        VariablePart memory a,
        VariablePart memory b
    ) private pure allocationUnchanged(a, b) {
        // a will have to reveal, so remove the stake beforehand
        /* require(
            newCommitment.allocation[0] == oldCommitment.allocation[0].sub(oldCommitment.stake),
            'Allocation for player A should be decremented by 1 stake from the previous commitment.'
        );
        require(
            newCommitment.allocation[1] == oldCommitment.allocation[1].add(oldCommitment.stake),
            'Allocation for player B should be incremented by 1 stake from the previous commitment.'
        );
        require(
            newCommitment.preCommit == oldCommitment.preCommit,
            'Precommit should be the same as the previous commitment.'
        ); */
    }

    function validateRoundAcceptedToReveal(
        VariablePart memory a,
        VariablePart memory b
    ) private pure allocationUnchanged(a, b) {
        uint256 aWinnings;
        uint256 bWinnings;

        RockPaperScissorsGameData memory fromGameData = appData(a.appData);
        RockPaperScissorsGameData memory toGameData = appData(b.appData);

        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory assetOutcomeA = abi.decode(outcomeA[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AssetOutcome memory assetOutcomeB = abi.decode(outcomeB[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AllocationItem[] memory allocationA = abi.decode(
            assetOutcomeA.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory allocationB = abi.decode(
            assetOutcomeB.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        require(
            toGameData.playerSecondWeapon == fromGameData.playerSecondWeapon,
            "PlayerSecond's weapon should be the same between commitments."
        );

        // check hash matches
        // need to convert Weapon -> uint256 to get hash to work
        bytes32 hashed = keccak256(
            abi.encodePacked(uint256(toGameData.playerFirstWeapon), toGameData.salt)
        );
        require(hashed == fromGameData.preCommit, 'The hash needs to match the preCommit');

        // calculate winnings
        (aWinnings, bWinnings) = winnings(
            toGameData.playerFirstWeapon,
            toGameData.playerSecondWeapon,
            allocationA,
            allocationB
        );

        require(
            allocationB.amount[0] == allocationA.amount[0].add(aWinnings),
            "Player A's allocation should be updated with the winnings."
        );
        require(
            allocationB.amount[1] == allocationA.amount[1].add(bWinnings),
            "Player B's allocation should be updated with the winnings."
        );
    }

    function validateRevealToStart(
        RockPaperScissorsCommitment.RPSCommitmentStruct memory oldCommitment,
        RockPaperScissorsCommitment.RPSCommitmentStruct memory newCommitment
    ) private pure allocationUnchanged(oldCommitment, newCommitment) {}
}
