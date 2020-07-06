pragma solidity ^0.6.0;
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
        uint256 stake; // this is contributed by each player. If you win, you get your stake back as well as the stake of the other player. If you lose, you lose your stake.
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
     * @return true if the transition conforms to the rules, false otherwise.
     */
    function validTransition(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        uint48, /* turnNumB */
        uint256 /* nParticipants */
    ) public override pure returns (bool) {
        Outcome.AllocationItem[] memory fromAllocation = extractAllocation(fromPart);
        Outcome.AllocationItem[] memory toAllocation = extractAllocation(toPart);
        _requireDestinationsUnchanged(fromAllocation, toAllocation);
        // decode application-specific data
        RPSData memory fromGameData = appData(fromPart.appData);
        RPSData memory toGameData = appData(toPart.appData);

        // deduce action
        if (fromGameData.positionType == PositionType.Start) {
            require(
                toGameData.positionType == PositionType.RoundProposed,
                'Start may only transition to RoundProposed'
            );
            requireValidPROPOSE(
                fromPart,
                toPart,
                fromAllocation,
                toAllocation,
                fromGameData,
                toGameData
            );
            return true;
        } else if (fromGameData.positionType == PositionType.RoundProposed) {
            if (toGameData.positionType == PositionType.Start) {
                requireValidREJECT(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.RoundAccepted) {
                requireValidACCEPT(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            }
            revert('Proposed may only transition to Start or RoundAccepted');
        } else if (fromGameData.positionType == PositionType.RoundAccepted) {
            require(
                toGameData.positionType == PositionType.Reveal,
                'RoundAccepted may only transition to Reveal'
            );
            requireValidREVEAL(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.Reveal) {
            require(
                toGameData.positionType == PositionType.Start,
                'Reveal may only transition to Start'
            );
            requireValidFINISH(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        }
        revert('No valid transition found');
    }

    // action requirements

    function requireValidPROPOSE(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    )
        private
        pure
        outcomeUnchanged(fromPart, toPart)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {}

    function requireValidREJECT(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    )
        private
        pure
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {}

    function requireValidACCEPT(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(fromGameData.preCommit == toGameData.preCommit, 'Precommit should be the same.');

        // Since Player A has the unique privilege of knowing the result of the game after receiving this 'to' state,
        // Player B should modify the allocations as if they had won the game and Player A had lost.
        // This is to incentivize Player A to continue with the REVEAL (rather than disconnecting)
        // in the case where Player A knows they have lost.
        require(
            toAllocation[0].amount == fromAllocation[0].amount.sub(toGameData.stake),
            'Allocation for player A should be decremented by 1x stake'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.add(toGameData.stake),
            'Allocation for player B should be incremented by 1x stake.'
        );
    }

    function requireValidREVEAL(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            toGameData.bWeapon == fromGameData.bWeapon,
            "Player Second's weapon should be the same between commitments."
        );

        // check hash matches
        // need to convert Weapon -> uint256 to get hash to work
        bytes32 hashed = keccak256(abi.encode(uint256(toGameData.aWeapon), toGameData.salt));
        require(hashed == fromGameData.preCommit, 'The hash needs to match the precommit');

        // Recall that on the 'from' state, the allocations are as if Player A has lost.
        // First, undo this
        uint256 correctAmountA = fromAllocation[0].amount.add(fromGameData.stake);
        uint256 correctAmountB = fromAllocation[1].amount.sub(fromGameData.stake);

        // Next, transfer one "stake" from Loser to Winner
        if (toGameData.aWeapon == toGameData.bWeapon) {
            // a draw
        } else if (
            (toGameData.aWeapon == Weapon.Rock && toGameData.bWeapon == Weapon.Scissors) ||
            (toGameData.aWeapon > toGameData.bWeapon)
        ) {
            // player A won
            correctAmountA = correctAmountA.add(fromGameData.stake);
            correctAmountB = correctAmountB.sub(fromGameData.stake);
        } else {
            // player B won
            correctAmountA = correctAmountA.sub(fromGameData.stake);
            correctAmountB = correctAmountB.add(fromGameData.stake);
        }

        require(
            toAllocation[0].amount == correctAmountA,
            "Player A's allocation should reflect the result of the game."
        );
        require(
            toAllocation[1].amount == correctAmountB,
            "Player B's allocation should reflect the result of the game."
        );
    }

    function requireValidFINISH(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    )
        private
        pure
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {}

    function extractAllocation(VariablePart memory variablePart)
        private
        pure
        returns (Outcome.AllocationItem[] memory)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(
            variablePart.outcome,
            (Outcome.OutcomeItem[])
        );
        require(outcome.length == 1, 'RockPaperScissors: Only one asset allowed');

        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );

        require(
            assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),
            'RockPaperScissors: AssetOutcomeType must be Allocation'
        );

        Outcome.AllocationItem[] memory allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        require(
            allocation.length == 2,
            'RockPaperScissors: Allocation length must equal number of participants (i.e. 2)'
        );

        return allocation;
    }

    function _requireDestinationsUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation
    ) private pure {
        require(
            toAllocation[0].destination == fromAllocation[0].destination,
            'RockPaperScissors: Destimation playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'RockPaperScissors: Destimation playerB may not change'
        );
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
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) {
        require(
            fromAllocation[0].amount >= toGameData.stake,
            'The allocation for player A must not fall below the stake.'
        );
        require(
            fromAllocation[1].amount >= toGameData.stake,
            'The allocation for player B must not fall below the stake.'
        );
        _;
    }

    modifier allocationUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation
    ) {
        require(
            toAllocation[0].destination == fromAllocation[0].destination,
            'RockPaperScissors: Destination playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'RockPaperScissors: Destination playerB may not change'
        );
        require(
            toAllocation[0].amount == fromAllocation[0].amount,
            'RockPaperScissors: Amount playerA may not change'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount,
            'RockPaperScissors: Amount playerB may not change'
        );
        _;
    }
}
