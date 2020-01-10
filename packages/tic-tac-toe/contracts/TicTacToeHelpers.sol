pragma solidity ^0.5.11;

library TicTacToeHelpers {
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
