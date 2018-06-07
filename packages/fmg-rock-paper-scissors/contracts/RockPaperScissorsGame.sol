pragma solidity ^0.4.18;

import "fmg-core/contracts/State.sol";
import "./RockPaperScissorsState.sol";

contract RockPaperScissorsGame {
    using RockPaperScissorsState for bytes;

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

        revert();
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
        require(_new.stake() > 0);
        require(_old.aResolution() >= _new.stake()); // avoid integer overflow attacks
        require(_old.bResolution() >= _new.stake()); // avoid integer overflow attacks
        require(_new.aResolution() == _old.aResolution()); // resolution unchanged
        require(_new.bResolution() == _old.bResolution()); // resolution unchanged

        // we should maybe require that aPreCommit isn't empty, but then it will only hurt a later if it is
    }

    function validateStartToConcluded(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution());
        require(_new.bResolution() == _old.bResolution());
    }

    function validateRoundProposedToRejected(bytes _old, bytes _new) private pure {
        require(_new.aResolution() == _old.aResolution()); // resolution unchanged
        require(_new.bResolution() == _old.bResolution()); // resolution unchanged
    }

    function validateRoundProposedToRoundAccepted(bytes _old, bytes _new) private pure {
        // a will have to reveal, so remove the stake beforehand
        require(_new.aResolution() == _old.aResolution() - _old.stake());
        require(_new.bResolution() == _old.bResolution() + _old.stake());
        require(_new.stake() == _old.stake());
        require(_new.preCommit() == _old.preCommit());
    }

    function validateRoundAcceptedToReveal(bytes _old, bytes _new) private pure {
        uint256 aWinnings;
        uint256 bWinnings;

        require(_new.stake() == _old.stake());
        require(_new.bPlay() == _old.bPlay());

        // check hash matches
        // need to convert Play -> uint256 to get hash to work
        bytes32 hashed = keccak256(abi.encodePacked(uint256(_new.aPlay()), _new.salt()));
        require(hashed == _old.preCommit());

        // calculate winnings
        (aWinnings, bWinnings) = winnings(_old.aPlay(), _old.bPlay(), _old.stake());

        require(_new.aResolution() == _old.aResolution() + aWinnings);
        require(_new.bResolution() == _old.bResolution() - 2 * _old.stake() + bWinnings);
    }

    function validateRevealToStart(bytes _old, bytes _new) private pure {
        assert(_new.aResolution() == _old.aResolution());
        assert(_new.bResolution() == _old.bResolution());
    }
}
