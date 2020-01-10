pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import {TicTacToeHelpers} from './TicTacToeHelpers.sol';

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
        uint256 stake;
        uint16 Xs; // 110000000
        uint16 Os; // 001100000
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
    * @param turnNumB Used to calculate current turnTaker % nParticipants.
    * @param nParticipants Amount of players. Should be 2?
    * @return true if the transition conforms to the rules, false otherwise.
    */
    function validTransition(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        uint256 turnNumB, // Used to calculate current turnTaker % nParticipants
        uint256 nParticipants
    ) public pure returns (bool) {
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
            requireValidSTARTtoXPLAYING(
                fromPart,
                toPart,
                fromAllocation,
                toAllocation,
                fromGameData,
                toGameData
            );
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
                    fromPart,
                    toPart,
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
        VariablePart memory fromPart,
        VariablePart memory toPart,
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        outcomeUnchanged(fromPart, toPart)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.Os == 0, 'No Os on board');
        require(TicTacToeHelpers.madeStrictlyOneMark(toGameData.Xs, 0), 'One X placed');

        // Old TTTMago code
        // if (State.indexOfMover(_new) == 0) { // mover is A
        //     require(_new.aResolution() == _old.aResolution() + _new.stake());
        //     require(_new.bResolution() == _old.bResolution() - _new.stake());
        // } else if (State.indexOfMover(_new) == 1) { // mover is B
        //     require(_new.aResolution() == _old.aResolution() - _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + _new.stake());
        // }

        // Current X Player should get all the stake. This is to decrease griefing.
        // require(
        //     toAllocation[0].amount == fromAllocation[0].amount.sub(toGameData.stake),
        //     'Allocation for player A should be decremented by 1x stake'
        // );
        // require(
        //     toAllocation[1].amount == fromAllocation[1].amount.add(toGameData.stake),
        //     'Allocation for player B should be incremented by 1x stake.'
        // );

    }

    function requireValidXPLAYINGtoOPLAYING(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {
        require(toGameData.Xs == fromGameData.Xs, 'No Xs added to board');
        require(
            TicTacToeHelpers.madeStrictlyOneMark(toGameData.Os, fromGameData.Os),
            'One O placed'
        );

        // Old TTTMagmo code
        // if (State.indexOfMover(_new) == 0) {
        //     // mover is A
        //     require(_new.aResolution() == _old.aResolution() + 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        // } else if (State.indexOfMover(_new) == 1) {
        //     // mover is B
        //     require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        //     // note factor of 2 to swing fully to other player
        // }

    }

    function requireValidOPLAYINGtoXPLAYING(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {
        require(toGameData.Os == fromGameData.Os, 'No Os added to board');
        require(
            TicTacToeHelpers.madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs),
            'One X placed'
        );

        // Old TTTMagmo code
        // if (State.indexOfMover(_new) == 0) { // mover is A
        //     require(_new.aResolution() == _old.aResolution() + 2 * _new.stake()); // note extra factor of 2 to swing fully to other player
        //     require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        // } else if (State.indexOfMover(_new) == 1) { // mover is B
        //     require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        // } // mover gets to claim stakes: note factor of 2 to swing fully to other player

    }

    function requireValidXPLAYINGtoVICTORY(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    ) private pure noDisjointMoves(toGameData) stakeUnchanged(fromGameData, toGameData) {
        require(toGameData.Xs == fromGameData.Xs, 'No Xs added to board');
        require(
            TicTacToeHelpers.madeStrictlyOneMark(toGameData.Os, fromGameData.Os),
            'One O placed'
        );
        require(TicTacToeHelpers.hasWon(toGameData.Os), 'O has won');

        uint256 currentOsPlayer = 0; // Need to calculate this

        uint256 playerAWinnings; // playerOneWinnings
        uint256 playerBWinnings; // playerTwoWinnings
        // calculate winnings
        (playerAWinnings, playerBWinnings) = winnings(currentOsPlayer, toGameData.stake);

        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(playerAWinnings),
            "Player A's allocation should be updated with the winnings."
        );
        require(
            toAllocation[1].amount ==
                fromAllocation[1].amount.sub(fromGameData.stake.mul(2)).add(playerBWinnings),
            "Player B's allocation should be updated with the winnings."
        );

        // Old TTTMagmo code
        // if (State.indexOfMover(_new) == 0) {
        //     // mover is A
        //     require(_new.aResolution() == _old.aResolution() + 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        // } else if (State.indexOfMover(_new) == 1) {
        //     // mover is B
        //     require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        // } // mover gets to claim stakes

    }

    function requireValidOPLAYINGtoVICTORY(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        outcomeUnchanged(fromPart, toPart)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.Os == fromGameData.Os, 'No Os added to board');
        require(
            TicTacToeHelpers.madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs),
            'One X placed'
        );
        require(TicTacToeHelpers.hasWon(toGameData.Xs), 'X has won');

        uint256 currentXsPlayer = 1; // Need to calculate this

        uint256 playerAWinnings; // playerOneWinnings
        uint256 playerBWinnings; // playerTwoWinnings
        // calculate winnings
        (playerAWinnings, playerBWinnings) = winnings(currentXsPlayer, toGameData.stake);

        // Got Stack too deep
        // require(
        //     toAllocation[0].amount == fromAllocation[0].amount.add(playerAWinnings),
        //     "Player A's allocation should be updated with the winnings."
        // );
        // require(
        //     toAllocation[1].amount ==
        //         fromAllocation[1].amount.sub(fromGameData.stake.mul(2)).add(playerBWinnings),
        //     "Player B's allocation should be updated with the winnings."
        // );
    }

    function requireValidOPLAYINGtoDRAW(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {
        require(TicTacToeHelpers.isDraw(toGameData.Os, toGameData.Xs)); // check if board full.
        require(TicTacToeHelpers.madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs));
        require(toGameData.Os == fromGameData.Os, 'No Os added to board');

        // Old TTTMagmo code
        // crosses always plays first move and always plays the move that completes the board
        // if (State.indexOfMover(_new) == 0) {
        //     require(_new.aResolution() == _old.aResolution() + 2 * _new.stake()); // no extra factor of 2, restoring to parity
        //     require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        // } else if (State.indexOfMover(_new) == 1) {
        //     require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        // } // mover gets to restore parity to the winnings

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
    {}

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
    {}

    function extractAllocation(VariablePart memory variablePart)
        private
        pure
        returns (Outcome.AllocationItem[] memory)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(variablePart.outcome, (Outcome.OutcomeItem[]));
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

    function winnings(uint256 currentWinnerPlayer, uint256 stake)
        private
        pure
        returns (uint256, uint256)
    {
        if (currentWinnerPlayer == 0) {
            // first player won
            return (2 * stake, 0);
        } else if (currentWinnerPlayer == 1) {
            // second player won
            return (0, 2 * stake);
        } else {
            // Draw
            return (stake, stake);
        }
    }

    function _requireDestinationsUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation
    ) private pure {
        require(
            toAllocation[0].destination == fromAllocation[0].destination,
            'TicTacToe: Destimation playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'TicTacToe: Destimation playerB may not change'
        );
    }

    // modifiers
    modifier outcomeUnchanged(VariablePart memory a, VariablePart memory b) {
        require(keccak256(b.outcome) == keccak256(a.outcome), 'TicTacToe: Outcome must not change');
        _;
    }

    modifier noDisjointMoves(TTTData memory toGameData) {
        require(
            TicTacToeHelpers.areDisjoint(toGameData.Xs, toGameData.Os),
            'TicTacToe: No Disjoint Moves'
        );
        _;
    }

    modifier stakeUnchanged(TTTData memory fromGameData, TTTData memory toGameData) {
        require(
            fromGameData.stake == toGameData.stake,
            'The stake should be the same between commitments'
        );
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
            'TicTacToe: Destimation playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'TicTacToe: Destimation playerB may not change'
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
}
