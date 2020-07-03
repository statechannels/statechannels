pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

/**
 * @dev The TicTacToe contract complies with the ForceMoveApp interface and implements a game of Tic Tac Toe (henceforth TTT).
 * The following transitions are allowed:
 *
 * Start -> XPlaying  [ START ]
 * XPlaying -> OPlaying  [ XPLAYING ]
 * XPlaying -> Victory  [ VICTORY ]
 * OPlaying -> XPlaying [ OPLAYING ]
 * OPlaying -> Victory [ VICTORY ]
 * OPlaying -> Draw [ DRAW ]
 * Victory -> Switching [ SWITCH ] // Not implemented yet
 * Draw -> Switching [ SWITCH ] // Not implemented yet
 * Switching -> Start [ FINISH ] // Not implemented yet
 *
 */
contract TicTacToe is ForceMoveApp {
    using SafeMath for uint256;

    enum PositionType {Start, XPlaying, OPlaying, Draw, Victory}

    struct TTTData {
        PositionType positionType;
        uint256 stake; // this is contributed by each player. If you win, you get your stake back as well as the stake of the other player. If you lose, you lose your stake.
        uint16 Xs; // e.g. 110000000
        uint16 Os; // e.g. 001100000
    }

    /**
     * @notice Decodes the appData.
     * @dev Decodes the appData.
     * @param appDataBytes The abi.encode of a TTTData struct describing the application-specific data.
     * @return An TTTData struct containing the application-specific data.
     */
    function appData(bytes memory appDataBytes) internal pure returns (TTTData memory) {
        return abi.decode(appDataBytes, (TTTData));
    }

    /**
     * @notice Encodes the TTT update rules.
     * @dev Encodes the TTT update rules.
     * @param fromPart State being transitioned from.
     * @param toPart State being transitioned to.
     * @param nParticipants Amount of players. Must be 2
     * @return true if the transition conforms to the rules, false otherwise.
     */
    function validTransition(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        uint48, // turnNumB, (Not implemented)
        uint256 nParticipants
    ) public override pure returns (bool) {
        require(nParticipants == 2, 'There should be 2 participants');
        Outcome.AllocationItem[] memory fromAllocation = extractAllocation(fromPart);
        Outcome.AllocationItem[] memory toAllocation = extractAllocation(toPart);
        _requireDestinationsUnchanged(fromAllocation, toAllocation);
        // decode application-specific data
        TTTData memory fromGameData = appData(fromPart.appData);
        TTTData memory toGameData = appData(toPart.appData);

        // deduce action
        if (fromGameData.positionType == PositionType.Start) {
            require(
                toGameData.positionType == PositionType.XPlaying,
                'Start may only transition to XPlaying'
            );
            requireValidSTARTtoXPLAYING(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.XPlaying) {
            if (toGameData.positionType == PositionType.OPlaying) {
                requireValidXPLAYINGtoOPLAYING(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.Victory) {
                requireValidXPLAYINGtoVICTORY(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            }
            revert('XPlaying may only transition to OPlaying or Victory');
        } else if (fromGameData.positionType == PositionType.OPlaying) {
            if (toGameData.positionType == PositionType.XPlaying) {
                requireValidOPLAYINGtoXPLAYING(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.Victory) {
                requireValidOPLAYINGtoVICTORY(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.Draw) {
                requireValidOPLAYINGtoDRAW(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            }
            revert('OPlaying may only transition to XPlaying or Victory or Draw');
        } else if (fromGameData.positionType == PositionType.Draw) {
            require(
                toGameData.positionType == PositionType.Start,
                'Draw may only transition to Start'
            );
            requireValidDRAWtoSTART(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.Victory) {
            require(
                toGameData.positionType == PositionType.Start,
                'Victory may only transition to Start'
            );
            requireValidVICTORYtoSTART(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        }
        revert('No valid transition found');
    }

    function requireValidSTARTtoXPLAYING(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        disjointMarks(toGameData)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.Os == 0, 'There should be no Os on board');
        require(madeStrictlyOneMark(toGameData.Xs, 0), 'There should be one X placed');

        // Current X Player should get all the stake. This is to decrease griefing.
        // We assume that X Player is Player A
        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(toGameData.stake),
            'Allocation for player A should be incremented by 1x stake'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.sub(toGameData.stake),
            'Allocation for player B should be decremented by 1x stake.'
        );
    }

    function requireValidXPLAYINGtoOPLAYING(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        disjointMarks(toGameData)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.Xs == fromGameData.Xs, 'There should be no new Xs added to board');
        require(
            madeStrictlyOneMark(toGameData.Os, fromGameData.Os),
            'There should be one new O placed'
        );

        // Current O Player should get all the stake. This is to decrease griefing. We assume that O Player is Player B
        require(
            toAllocation[0].amount == fromAllocation[0].amount.sub(toGameData.stake.mul(2)),
            'Allocation for player A should be decremented by 1x stake'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.add(toGameData.stake.mul(2)),
            'Allocation for player B should be incremented by 1x stake.'
        );
    }

    function requireValidOPLAYINGtoXPLAYING(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        disjointMarks(toGameData)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.Os == fromGameData.Os, 'There should be no new Os added to board');
        require(
            madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs),
            'There should be one new X placed'
        );

        // Current X Player should get all the stake. This is to decrease griefing. We assume that X Player is Player A
        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(toGameData.stake * 2),
            'Allocation for player A should be incremented by 1x stake'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.sub(toGameData.stake * 2),
            'Allocation for player B should be decremented by 1x stake.'
        );
    }

    function requireValidXPLAYINGtoVICTORY(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    ) private pure disjointMarks(toGameData) stakeUnchanged(fromGameData, toGameData) {
        require(toGameData.Xs == fromGameData.Xs, 'There should be no new Xs added to board');
        require(
            madeStrictlyOneMark(toGameData.Os, fromGameData.Os),
            'There should be one new O placed'
        );
        require(hasWon(toGameData.Os), 'The move should result in O winning');

        uint256 currentOsPlayer = 1; // Need to calculate this

        // Recall that in the past state, the allocations are as if Player B has lost.
        // First, undo this
        uint256 correctAmountA = fromAllocation[0].amount.sub(fromGameData.stake);
        uint256 correctAmountB = fromAllocation[1].amount.add(fromGameData.stake);

        if (currentOsPlayer == 0) {
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

    function requireValidOPLAYINGtoVICTORY(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    ) private pure disjointMarks(toGameData) stakeUnchanged(fromGameData, toGameData) {
        require(toGameData.Os == fromGameData.Os, 'There should be no new Os added to board');
        require(
            madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs),
            'There should be one new X placed'
        );
        require(hasWon(toGameData.Xs), 'The move should result in X winning');

        uint256 currentXsPlayer = 0; // Need to calculate this

        // Recall that in the past state, the allocations are as if Player A has lost.
        // First, undo this
        uint256 correctAmountA = fromAllocation[0].amount.add(fromGameData.stake);
        uint256 correctAmountB = fromAllocation[1].amount.sub(fromGameData.stake);

        if (currentXsPlayer == 0) {
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

    function requireValidOPLAYINGtoDRAW(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    ) private pure disjointMarks(toGameData) stakeUnchanged(fromGameData, toGameData) {
        require(
            isDraw(toGameData.Os, toGameData.Xs),
            'The board should be full and result in a draw'
        );
        require(toGameData.Os == fromGameData.Os, 'There should be no new Os added to board');
        require(
            madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs),
            'There should be one new X placed'
        );

        // Recall that in the past state, the allocations are as if Player A has lost.
        // TODO This logic will only work if PlayerA is Xs and PlayerB is Os
        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(toGameData.stake),
            "Player A's allocation should reflect the result of the game."
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.sub(toGameData.stake),
            "Player B's allocation should reflect the result of the game."
        );
    }

    function requireValidDRAWtoSTART(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {
        require(toGameData.Os == 0, 'The Os should be reset to 0');
        require(toGameData.Xs == 0, 'The Xs should be reset to 0');
    }

    function requireValidVICTORYtoSTART(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {
        require(toGameData.Os == 0, 'The Os should be reset to 0');
        require(toGameData.Xs == 0, 'The Xs should be reset to 0');
    }

    function extractAllocation(VariablePart memory variablePart)
        private
        pure
        returns (Outcome.AllocationItem[] memory)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(
            variablePart.outcome,
            (Outcome.OutcomeItem[])
        );
        require(outcome.length == 1, 'TicTacToe: Only one asset allowed');

        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );

        require(
            assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),
            'TicTacToe: AssetOutcomeType must be Allocation'
        );

        Outcome.AllocationItem[] memory allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        require(
            allocation.length == 2,
            'TicTacToe: Allocation length must equal number of participants (i.e. 2)'
        );

        return allocation;
    }

    function _requireDestinationsUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation
    ) private pure {
        require(
            toAllocation[0].destination == fromAllocation[0].destination,
            'TicTacToe: Destination playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'TicTacToe: Destination playerB may not change'
        );
    }

    // modifiers
    modifier outcomeUnchanged(VariablePart memory a, VariablePart memory b) {
        require(keccak256(b.outcome) == keccak256(a.outcome), 'TicTacToe: Outcome must not change');
        _;
    }

    modifier disjointMarks(TTTData memory toGameData) {
        require(areDisjoint(toGameData.Xs, toGameData.Os), 'TicTacToe: No Disjoint Moves');
        _;
    }

    modifier stakeUnchanged(TTTData memory fromGameData, TTTData memory toGameData) {
        require(fromGameData.stake == toGameData.stake, 'The stake should be the same');
        _;
    }

    modifier allocationsNotLessThanStake(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
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
            'TicTacToe: Destination playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'TicTacToe: Destination playerB may not change'
        );
        require(
            toAllocation[0].amount == fromAllocation[0].amount,
            'TicTacToe: Amount playerA may not change'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount,
            'TicTacToe: Amount playerB may not change'
        );
        _;
    }

    // helper functions

    // Unravelling of grid is as follows:
    //
    //      0  |  1  |  2
    //   +-----------------+
    //      3  |  4  |  5
    //   +-----------------+
    //      6  |  7  |  8
    //
    // The binary representation A single mark is 2**(8-index).
    //
    // e.g. Os = 000000001
    //      Xs = 010000000
    //
    // corresponds to
    //
    //         |  X  |
    //   +-----------------+
    //         |     |
    //   +-----------------+
    //         |     |  0
    //
    uint16 constant topRow = 448; /*  0b111000000 = 448 mask for win @ row 1 */
    uint16 constant midRow = 56; /*  0b000111000 =  56 mask for win @ row 2 */
    uint16 constant botRow = 7; /*  0b000000111 =   7 mask for win @ row 3 */
    uint16 constant lefCol = 292; /*  0b100100100 = 292 mask for win @ col 1 */
    uint16 constant midCol = 146; /*  0b010010010 = 146 mask for win @ col 2 */
    uint16 constant rigCol = 73; /*  0b001001001 =  73 mask for win @ col 3 */
    uint16 constant dhDiag = 273; /*  0b100010001 = 273 mask for win @ downhill diag */
    uint16 constant uhDiag = 84; /*  0b001010100 =  84 mask for win @ uphill diag */
    //
    uint16 constant fullBd = 511; /*  0b111111111 = 511 full board */

    // Xs = 111000100 & topRow = 111000000 === WIN
    function hasWon(uint16 _marks) public pure returns (bool) {
        return (((_marks & topRow) == topRow) ||
            ((_marks & midRow) == midRow) ||
            ((_marks & botRow) == botRow) ||
            ((_marks & lefCol) == lefCol) ||
            ((_marks & midCol) == midCol) ||
            ((_marks & rigCol) == rigCol) ||
            ((_marks & dhDiag) == dhDiag) ||
            ((_marks & uhDiag) == uhDiag));
    }

    // Xs === 111100001; Os === 000011110; DRAW
    function isDraw(uint16 _Os, uint16 _Xs) public pure returns (bool) {
        if ((_Os ^ _Xs) == fullBd) {
            return true; // using XOR. Note that a draw could include a winning position that is unnoticed / unclaimed
        } else return false;
    }

    // Valid
    // OLD: Xs = 1100000000
    // NEW: Xs = 1100000001
    // Invalid - Erased
    // OLD: Xs = 1100000001
    // NEW: Xs = 1100000000
    // Invalid - Double move
    // OLD: Xs = 1100000000
    // NEW: Xs = 1100000011
    function madeStrictlyOneMark(uint16 _new_marks, uint16 _old_marks) public pure returns (bool) {
        uint16 i;
        bool already_marked = false;
        for (i = 0; i < 9; i++) {
            if ((_new_marks >> i) % 2 == 0 && (_old_marks >> i) % 2 == 1) {
                return false; // erased a mark
            } else if ((_new_marks >> i) % 2 == 1 && (_old_marks >> i) % 2 == 0) {
                if (already_marked == true) {
                    return false; // made two or more marks
                }
                already_marked = true; // made at least one mark
            }
        }
        if (_new_marks == _old_marks) {
            return false;
        } // do not allow a non-move
        return true;
    }

    // Checks that no mark was overriden
    function areDisjoint(uint16 _Os, uint16 _Xs) public pure returns (bool) {
        if ((_Os & _Xs) == 0) {
            return true;
        } else return false;
    }
}
