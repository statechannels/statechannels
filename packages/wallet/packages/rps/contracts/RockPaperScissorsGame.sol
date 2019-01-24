pragma solidity ^0.4.18;

import "fmg-core/contracts/State.sol";
import "./RockPaperScissorsState.sol";

contract RockPaperScissorsGame {
    using RockPaperScissorsState for bytes;
    string constant RESOLUTION_A_SAME = "The resolution for player A must be the same between states.";
    string constant RESOLUTION_B_SAME = "The resolution for player B must be the same between states.";
    string constant INTEGER_OVERFLOW_PREVENT = "Preventing a integer overflow attack";
    string constant SAME_STAKE = "The stake should be the same between states";

    // The following transitions are allowed:
    //
    // Start -> RoundProposed
    // RoundProposed -> Start // reject game
    // RoundProposed -> RoundAccepted
    // RoundAccepted -> Reveal
    // Reveal -> Start
    // Start -> Concluded
    //
    function validTransition(bytes _old, bytes _new) public pure returns (bool) {
        if (_old.positionType() == RockPaperScissorsState.PositionType.Start) {
            if (_new.positionType() == RockPaperScissorsState.PositionType.RoundProposed) {
                validateStartToRoundProposed(_old, _new);

                return true;
            } else if (_new.positionType() == RockPaperScissorsState.PositionType.Concluded) {
                validateStartToConcluded(_old, _new);

                return true;
            }
        } else if (_old.positionType() == RockPaperScissorsState.PositionType.RoundProposed) {
            if (_new.positionType() == RockPaperScissorsState.PositionType.Start) { // game rejected
                validateRoundProposedToRejected(_old, _new);

                return true;
            } else if (_new.positionType() == RockPaperScissorsState.PositionType.RoundAccepted) {
                validateRoundProposedToRoundAccepted(_old, _new);

                return true;
            }
        } else if (_old.positionType() == RockPaperScissorsState.PositionType.RoundAccepted) {
            if (_new.positionType() == RockPaperScissorsState.PositionType.Reveal) {
                validateRoundAcceptedToReveal(_old, _new);

                return true;
            }
        } else if (_old.positionType() == RockPaperScissorsState.PositionType.Reveal) {
            if (_new.positionType() == RockPaperScissorsState.PositionType.Start) {
                validateRevealToStart(_old, _new);

                return true;
            }
        }

        revert("No valid transition found for states");
    }

    function winnings(RockPaperScissorsState.Play firstPlay, RockPaperScissorsState.Play secondPlay, uint256 stake)
    private pure returns (uint256, uint256) {
        if (firstPlay == secondPlay) { // no-one won
            return (stake, stake);
        } else if ((firstPlay == RockPaperScissorsState.Play.Rock && secondPlay == RockPaperScissorsState.Play.Scissors) ||
                  (firstPlay > secondPlay)) { // first player won
            return (2 * stake, 0);
        } else { // second player won
            return (0, 2 * stake);
        }
    }

    // transition validations
    function validateStartToRoundProposed(bytes _old, bytes _new) private pure {
        require(_new.stake() == _old.stake());
        require(_old.aResolution() >= _new.stake(),INTEGER_OVERFLOW_PREVENT); // avoid integer overflow attacks
        require(_old.bResolution() >= _new.stake(),INTEGER_OVERFLOW_PREVENT); // avoid integer overflow attacks
        require(_new.aResolution() == _old.aResolution(),RESOLUTION_A_SAME); // resolution unchanged
        require(_new.bResolution() == _old.bResolution(),RESOLUTION_B_SAME); // resolution unchanged

        // we should maybe require that aPreCommit isn't empty, but then it will only hurt a later if it is
    }

    function validateStartToConcluded(bytes _old, bytes _new) private pure {
        require(_new.stake() == _old.stake());
        require(_new.aResolution() == _old.aResolution(),RESOLUTION_A_SAME);
        require(_new.bResolution() == _old.bResolution(), RESOLUTION_B_SAME);
    }

    function validateRoundProposedToRejected(bytes _old, bytes _new) private pure {
        require(_new.stake() == _old.stake());
        require(_new.aResolution() == _old.aResolution(),RESOLUTION_A_SAME); // resolution unchanged
        require(_new.bResolution() == _old.bResolution(),RESOLUTION_B_SAME); // resolution unchanged
    }

    function validateRoundProposedToRoundAccepted(bytes _old, bytes _new) private pure {
        // a will have to reveal, so remove the stake beforehand
        require(_new.aResolution() == _old.aResolution() - _old.stake(),"Resolution for player A should be decremented by 1 stake from the previous state.");
        require(_new.bResolution() == _old.bResolution() + _old.stake(),"Resolution for player B should be incremented by 1 stake from the previous state.");
        require(_new.stake() == _old.stake(),SAME_STAKE);
        require(_new.preCommit() == _old.preCommit(),"Precommit should be the same as the previous state.");
    }

    function validateRoundAcceptedToReveal(bytes _old, bytes _new) private pure {
        uint256 aWinnings;
        uint256 bWinnings;

        require(_new.stake() == _old.stake(),SAME_STAKE);
        require(_new.bPlay() == _old.bPlay(),"Player Bs play should be the same between states.");

        // check hash matches
        // need to convert Play -> uint256 to get hash to work
        bytes32 hashed = keccak256(abi.encodePacked(uint256(_new.aPlay()), _new.salt()));
        require(hashed == _old.preCommit(),"The hash needs to match the precommit");

        // calculate winnings
        (aWinnings, bWinnings) = winnings(_new.aPlay(), _new.bPlay(), _new.stake());

        require(_new.aResolution() == _old.aResolution() + aWinnings,"Player A's resolution should be updated with the winning");
        require(_new.bResolution() == _old.bResolution() - 2 * _old.stake() + bWinnings,"Player B's resolution should be updated with the winning");
    }

    function validateRevealToStart(bytes _old, bytes _new) private pure {
        require(_new.stake() == _old.stake(),SAME_STAKE);
        require(_new.aResolution() == _old.aResolution(),RESOLUTION_A_SAME);
        require(_new.bResolution() == _old.bResolution(),RESOLUTION_B_SAME);
    }
}
