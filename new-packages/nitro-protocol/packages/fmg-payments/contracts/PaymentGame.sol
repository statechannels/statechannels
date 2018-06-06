pragma solidity ^0.4.18;

import "./State.sol";
import "./PaymentState.sol";

contract PaymentGame {
    using State for bytes;
    using PaymentState for bytes;

    function validTransition(bytes _old, bytes _new) public pure returns (bool) {

        // conserve total balance
        require(_old.aBal() + _old.bBal() == _new.aBal() + _new.bBal());

        // can't take someone else's funds by moving
        if (_new.indexOfMover() == 0) { // a is moving
            require(_new.aBal() <= _old.aBal()); // so aBal can't increase
        } else { // b is moving
            require(_new.bBal() <= _old.bBal()); // so aBal can't increase
        }

        return true;
    }
}
