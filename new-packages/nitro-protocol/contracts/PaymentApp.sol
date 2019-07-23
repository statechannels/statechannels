pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import "./Commitment.sol";
import "./PaymentCommitment.sol";

contract PaymentApp {
    using Commitment for Commitment.CommitmentStruct;
    using PaymentCommitment for Commitment.CommitmentStruct;
    function validTransition(Commitment.CommitmentStruct memory _old, Commitment.CommitmentStruct memory _new) public pure returns (bool) {

        // conserve total balance
        require(_old.aBal() + _old.bBal() == _new.aBal() + _new.bBal(),'PaymentApp: The balance must be conserved.');

        // can't take someone else's funds by moving
        if (_new.indexOfMover() == 0) { // a is moving
            require(_new.aBal() <= _old.aBal(),'PaymentApp: Player A cannot increase their own allocation.'); // so aBal can't increase
        } else { // b is moving
            require(_new.bBal() <= _old.bBal(),'PaymentApp: Player B cannot increase their own allocation.'); // so aBal can't increase
        }

        return true;
    }
}
