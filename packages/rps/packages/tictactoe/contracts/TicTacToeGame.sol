pragma solidity ^0.4.18;

import "fmg-core/contracts/State.sol";
import "./TicTacToeState.sol";
import { TicTacToeHelpers } from "./TicTacToeHelpers.sol";

contract TicTacToeGame {
    using TicTacToeState for bytes;

    // NOTE ON ERROR MESSAGES:
    // require() messages we will incur n * 20,000 gas for each error message used, where n is the number of 32 byte slots it takes up
    // https://github.com/ethereum/solidity/issues/4588
    // This gas cost of deploying this contract is close the typical block gas limit, implying that it should be deployed in
    // several smaller stages if we want to have require() messages.
    
    // The following transitions are allowed:
    
    // XPlaying -> OPlaying
    // XPlaying -> Victory

    // NB: We cannot transition from XPlaying to Draw (X is always completing the board because X goes first) remember we are transitioning *from* Xplay, so noughts are making the new marks
    
    // OPlaying -> XPlaying
    // OPlaying -> Victory
    // OPlaying -> Draw
    
    // Victory -> PlayAgainMeFirst
    //
    // Draw    -> PlayAgainMeFirst
    //
    // PlayAgainMeFirst -> PlayAgainMeSecond
    //
    // PlayAgainMeSecond -> XPlaying

    function validTransition(bytes _old, bytes _new) public pure returns (bool) {
        if (_old.positionType() == TicTacToeState.PositionType.XPlaying) {

            if (_new.positionType() == TicTacToeState.PositionType.OPlaying) {

                validateXPlayingToOPlaying(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Victory) {

                validateXPlayingToVictory(_old, _new);

                return true;

            }
        } else if (_old.positionType() == TicTacToeState.PositionType.OPlaying) {

            if (_new.positionType() == TicTacToeState.PositionType.XPlaying) {

                validateOPlayingToXPlaying(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Victory) {

                validateOPlayingToVictory(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Draw) {

                validateOPlayingToDraw(_old, _new);

                return true;
            
            }
        } else if (_old.positionType() == TicTacToeState.PositionType.Victory) {

            if (_new.positionType() == TicTacToeState.PositionType.PlayAgainMeFirst) {

                validateVictoryToPlayAgainMeFirst(_old, _new);

                return true;

            } 
            // TODO consider allowing a transition to PlayAgainMeSecond, to allow the loser to forfeit their right to go first
            
        } else if (_old.positionType() == TicTacToeState.PositionType.Draw) {

            if (_new.positionType() == TicTacToeState.PositionType.PlayAgainMeFirst) {

                validateDrawToPlayAgainMeFirst(_old, _new);

                return true;

            }
        } else if (_old.positionType() == TicTacToeState.PositionType.PlayAgainMeFirst) {

            if (_new.positionType() == TicTacToeState.PositionType.PlayAgainMeSecond) {

                validatePlayAgainMeFirstToPlayAgainMeSecond(_old, _new);

                return true;

            } 
        } else if (_old.positionType() == TicTacToeState.PositionType.PlayAgainMeSecond) {

            if (_new.positionType() == TicTacToeState.PositionType.XPlaying) {

                validatePlayAgainMeSecondToXPlaying(_old, _new);

                return true;

            }
        } 
        revert("Could not match to a valid transition.");
        // return false;
    }

    // transition validations
    function validateXPlayingToOPlaying(bytes _old, bytes _new) private pure {
        require(_new.stake() == _old.stake());
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.noughts(), _old.noughts()));
        require((_new.crosses() == _old.crosses()));   
        if (State.indexOfMover(_new) == 0) { // mover is A
            require(_new.aResolution() == _old.aResolution() + 2 * _new.stake()); 
            require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        } else if (State.indexOfMover(_new) == 1) { // mover is B
            require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
            require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
            // note factor of 2 to swing fully to other player
        } 
    }
    
    function validateXPlayingToVictory(bytes _old, bytes _new) private pure {
        require(TicTacToeHelpers.hasWon(_new.noughts()));
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.noughts(), _old.noughts()));
        require((_new.crosses() == _old.crosses()));   
        if (State.indexOfMover(_new) == 0) { // mover is A
            require(_new.aResolution() == _old.aResolution() + 2 * _new.stake());
            require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        } else if (State.indexOfMover(_new) == 1) { // mover is B
            require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
            require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        } // mover gets to claim stakes
    } 

    function validateOPlayingToXPlaying(bytes _old, bytes _new) private pure {
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.crosses(), _old.crosses()));
        require((_new.noughts() == _old.noughts()));
        if (State.indexOfMover(_new) == 0) { // mover is A
            require(_new.aResolution() == _old.aResolution() + 2 * _new.stake()); // note extra factor of 2 to swing fully to other player
            require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        } else if (State.indexOfMover(_new) == 1) { // mover is B
            require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
            require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        } // mover gets to claim stakes: note factor of 2 to swing fully to other player
    }

    function validateOPlayingToVictory(bytes _old, bytes _new) private pure {
        require(TicTacToeHelpers.hasWon(_new.crosses()));
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.crosses(), _old.crosses()));
        require((_new.noughts() == _old.noughts()));   
        if (State.indexOfMover(_new) == 0) { // mover is A
            require(_new.aResolution() == _old.aResolution() + 2 * _new.stake());
            require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        } else if (State.indexOfMover(_new) == 1) { // mover is B
            require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
            require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        } // mover gets to claim stakes: note factor of 2 to swing fully to other player
    }

    function validateOPlayingToDraw(bytes _old, bytes _new) private pure {
        require(TicTacToeHelpers.isDraw(_new.noughts(), _new.crosses())); // check if board full. 
        // crosses always plays first move and always plays the move that completes the board
        if (State.indexOfMover(_new) == 0) {
            require(_new.aResolution() == _old.aResolution() + 1 * _new.stake()); // no extra factor of 2, restoring to parity
            require(_new.bResolution() == _old.bResolution() - 1 * _new.stake());
        } else if (State.indexOfMover(_new) == 1) {
            require(_new.aResolution() == _old.aResolution() - 1 * _new.stake());
            require(_new.bResolution() == _old.bResolution() + 1 * _new.stake());
        } // mover gets to restore parity to the winnings
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.crosses(), _old.crosses()));
        require((_new.noughts() == _old.noughts()));
    }

    function validateVictoryToPlayAgainMeFirst(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
    }

    function validateDrawToPlayAgainMeFirst(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
    }

    function validatePlayAgainMeFirstToPlayAgainMeSecond(bytes _old, bytes _new) private pure {
        require(_new.stake() == _old.stake());
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
    }
    
    function validatePlayAgainMeSecondToXPlaying(bytes _old, bytes _new) private pure {
        require(_new.noughts() == 0);
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.crosses(),0)); // Xs moves first
        require(_new.stake() == _old.stake());
        if (State.indexOfMover(_new) == 0) { // mover is A
            require(_new.aResolution() == _old.aResolution() + _new.stake());
            require(_new.bResolution() == _old.bResolution() - _new.stake());
        } else if (State.indexOfMover(_new) == 1) { // mover is B
            require(_new.aResolution() == _old.aResolution() - _new.stake());
            require(_new.bResolution() == _old.bResolution() + _new.stake());
        }
    }
}
