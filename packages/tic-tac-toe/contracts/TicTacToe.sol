pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

/**
  * @dev The TicTacToe contract complies with the ForceMoveApp interface and implements a commit-reveal game of Tic Tac Toe (henceforth TTT).
  * The following transitions are allowed:
  *
  * Start -> XPlaying  [ START ]
  * XPlaying -> OPlaying  [ XPLAYING ]
  * XPlaying -> Victory  [ VICTORY ]
  * OPlaying -> XPlaying [ OPLAYING ]
  * OPlaying -> Victory [ VICTORY ]
  * OPlaying -> Draw [ DRAW ]
  * Victory -> Start [ FINISH ]
  * Draw -> Start [ FINISH ]
  *
*/
contract TicTacToe is ForceMoveApp {
    using SafeMath for uint256;

    enum PositionType {Start, XPlaying, OPlaying, Draw, Victory}
    enum Weapon {Rock, Paper, Scissors}

    struct TTTData {
        PositionType positionType;
        uint256 stake;
        uint256[3][3] board;
        uint256 countXs;
        uint256 countOs;
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
    * @return true if the transition conforms to the rules, false otherwise.
    */
    function validTransition(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        uint256, /* turnNumB */
        uint256  /* nParticipants */
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
                requireValidXPLAYINGtoOPLAYING(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.Victory) {
                requireValidXPLAYINGtoVICTORY(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            }
            revert('XPlaying may only transition to OPlaying or Victory');
        } else if (fromGameData.positionType == PositionType.OPlaying) {
            if (toGameData.positionType == PositionType.XPlaying) {
                requireValidOPLAYINGtoXPLAYING(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.Victory) {
                requireValidOPLAYINGtoVICTORY(fromAllocation, toAllocation, fromGameData, toGameData);
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

    // action requirements

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
        outcomeUnchanged(fromPart, toPart)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.countOs == 0, "No Os on board");
        require(toGameData.countXs == 1, "One X placed");
        // Check that only one play was made
    }

    function requireValidXPLAYINGtoOPLAYING(
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
        require(toGameData.countOs == fromGameData.countOs + 1, "One O placed");
        require(toGameData.countXs == fromGameData.countXs, "No Xs placed");
        // Check that only one play was made
        // Check that play doesn't overwrite old board
    }

    function requireValidOPLAYINGtoXPLAYING(
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
        require(toGameData.countXs == fromGameData.countXs + 1, "One X placed");
        require(toGameData.countOs == fromGameData.countOs, "No Os placed");
        // Check that only one play was made
        // Check that play doesn't overwrite old board
    }

    function requireValidXPLAYINGtoVICTORY(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(toGameData.countXs == fromGameData.countXs + 1, "One X placed");
        require(toGameData.countOs == fromGameData.countOs, "No Os placed");
        // Check that only one play was made
        // Check that X has won

        uint256 playerAWinnings; // playerOneWinnings
        uint256 playerBWinnings; // playerTwoWinnings
        // calculate winnings
        (playerAWinnings, playerBWinnings) = winnings(
            toGameData.board,
            toGameData.stake
        );

        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(playerAWinnings),
            "Player A's allocation should be updated with the winnings."
        );
        require(
            toAllocation[1].amount ==
                fromAllocation[1].amount.sub(fromGameData.stake.mul(2)).add(playerBWinnings),
            "Player B's allocation should be updated with the winnings."
        );
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
        outcomeUnchanged(fromPart, toPart)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.countOs == fromGameData.countOs + 1, "One O placed");
        require(toGameData.countXs == fromGameData.countXs, "No Xs placed");
        // Check that only one play was made
        // Check that O has won

        uint256 playerAWinnings; // playerOneWinnings
        uint256 playerBWinnings; // playerTwoWinnings
        // calculate winnings
        (playerAWinnings, playerBWinnings) = winnings(
            toGameData.board,
            toGameData.stake
        );

        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(playerAWinnings),
            "Player A's allocation should be updated with the winnings."
        );
        require(
            toAllocation[1].amount ==
                fromAllocation[1].amount.sub(fromGameData.stake.mul(2)).add(playerBWinnings),
            "Player B's allocation should be updated with the winnings."
        );
    }

    function requireValidOPLAYINGtoDRAW(
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
        require(toGameData.countOs == fromGameData.countOs + 1, "One O placed");
        require(toGameData.countXs == fromGameData.countXs, "No Xs placed");
        //Check that this is draw. Board is full
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

    function winnings(Weapon aWeapon, Weapon bWeapon, uint256 stake)
        private
        pure
        returns (uint256, uint256)
    {
        if (aWeapon == bWeapon) {
            return (stake, stake);
        } else if ((aWeapon == Weapon.Rock && bWeapon == Weapon.Scissors) || (aWeapon > bWeapon)) {
            // first player won
            return (2 * stake, 0);
        } else {
            // second player won
            return (0, 2 * stake);
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
        require(
            keccak256(b.outcome) == keccak256(a.outcome),
            'TicTacToe: Outcome must not change'
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