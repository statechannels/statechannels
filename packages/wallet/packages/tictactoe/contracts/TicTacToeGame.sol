pragma solidity ^0.4.18;

import "fmg-core/contracts/State.sol";
import "./TicTacToeState.sol";
import { TicTacToeHelpers } from "./TicTacToeHelpers.sol";

contract TicTacToeGame {
    using TicTacToeState for bytes;

    // require() messages we will incur n * 20,000 gas for each error message used, where n is the number of 32 byte slots it takes up
    // https://github.com/ethereum/solidity/issues/4588

    
    // The following transitions are allowed:
    //
    // Rest    -> Xplaying
    // Rest    -> Conclude but Conclude is an FMG position -- does it belong here?
    //
    // Xplaying -> Oplaying
    // Xplaying -> Victory
    // cannot get to draw (X is always completing the board because X goes first) remember we are transitioning *from* Xplay, so noughts are making the new marks
    // Xplaying -> Resting ("noughts" player rejects game)
    //
    // Oplaying -> Xplaying
    // Oplaying -> Victory
    // Oplaying -> Draw

    //
    // Victory -> Rest
    // Victory -> Xplaying
    //
    // Draw    -> Rest
    // Draw    -> Xplaying
    //

    function validTransition(bytes _old, bytes _new) public pure returns (bool) {

        if (_old.positionType() == TicTacToeState.PositionType.Rest) {
            if (_new.positionType() == TicTacToeState.PositionType.Xplaying) {

                validateRestToXplaying(_old, _new);

                return true;

            } 
        } else if (_old.positionType() == TicTacToeState.PositionType.Xplaying) {

            if (_new.positionType() == TicTacToeState.PositionType.Oplaying) {

                validateXplayingToOplaying(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Victory) {

                validateXplayingToVictory(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Rest) {

                validateXplayingToRest(_old, _new);

                return true;
              }
        } else if (_old.positionType() == TicTacToeState.PositionType.Oplaying) {

            if (_new.positionType() == TicTacToeState.PositionType.Xplaying) {

                validateOplayingToXplaying(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Victory) {

                validateOplayingToVictory(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Draw) {

                validateOplayingToDraw(_old, _new);

                return true;
            
            }
        } else if (_old.positionType() == TicTacToeState.PositionType.Victory) {

            if (_new.positionType() == TicTacToeState.PositionType.Rest) {

                validateVictoryToRest(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Xplaying) {

                validateVictoryToXplaying(_old, _new);

                return true;

            }
        } else if (_old.positionType() == TicTacToeState.PositionType.Draw) {

            if (_new.positionType() == TicTacToeState.PositionType.Rest) {

                validateDrawToRest(_old, _new);

                return true;

            } else if (_new.positionType() == TicTacToeState.PositionType.Xplaying) {

                validateDrawToXplaying(_old, _new);

                return true;

            }
        } 
        revert("Could not match to a valid transition.");
        // return false;
    }

    // transition validations

    function validateRestToXplaying(bytes _old, bytes _new) private pure {
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

    function validateRestToConcluded(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
    }

    function validateXplayingToOplaying(bytes _old, bytes _new) private pure {
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
    
    function validateXplayingToVictory(bytes _old, bytes _new) private pure {
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

    function validateXplayingToRest(bytes _old, bytes _new) private pure {
        require(_old.noughts() == 0); // don't allow this transition unless noughts has yet to make any marks
        if (State.indexOfMover(_new) == 0) { // Mover is A
            // revert balances
            require(_new.aResolution() == _old.aResolution() + _old.stake());
            require(_new.bResolution() == _old.bResolution() - _old.stake());
        } else if (State.indexOfMover(_new) == 1) { // Mover is B
            // revert balances
            require(_new.aResolution() == _old.aResolution() - _old.stake());
            require(_new.bResolution() == _old.bResolution() + _old.stake());
        } 
    }

    function validateOplayingToXplaying(bytes _old, bytes _new) private pure {
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

    function validateOplayingToVictory(bytes _old, bytes _new) private pure {
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

    function validateOplayingToDraw(bytes _old, bytes _new) private pure {
        require(TicTacToeHelpers.isDraw(_new.noughts(), _new.crosses())); // check if board full. 
        // crosses always plays first move and always plays the move that completes the board
        if (State.indexOfMover(_new) == 0) {
            require(_new.aResolution() == _old.aResolution() + 2 * _new.stake()); // no extra factor of 2, restoring to parity
            require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        } else if (State.indexOfMover(_new) == 1) {
            require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
            require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        } // mover gets to restore parity to the winnings
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.crosses(), _old.crosses()));
        require((_new.noughts() == _old.noughts()));
    }

    function validateVictoryToRest(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
    }

    function validateDrawToRest(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
    }

    function validateVictoryToXplaying(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
        require(_new.noughts() == 0);
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.crosses(),0));
         // crosses always goes first. there is no _old.crosses, so set to zero here
    }

    function validateDrawToXplaying(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
        require(_new.noughts() == 0);
        require(TicTacToeHelpers.madeStrictlyOneMark(_new.crosses(),0));
         // crosses always goes first. there is no _old.crosses, so set to zero here
    }

}
