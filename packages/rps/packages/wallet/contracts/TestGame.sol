pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;
import "fmg-nitro-adjudicator/contracts/NitroAdjudicator.sol";


contract TestGame {
    function validTransition(Commitment.CommitmentStruct memory _old, Commitment.CommitmentStruct memory _new) public pure returns (bool) {
       return true;
    }
}