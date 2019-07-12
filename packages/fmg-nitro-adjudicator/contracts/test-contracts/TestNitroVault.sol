pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;
import "fmg-core/contracts/Commitment.sol";
import "fmg-core/contracts/Rules.sol";
import "../NitroVault.sol";

contract TestNitroVault is NitroVault {
    using Commitment for Commitment.CommitmentStruct;

    function reprioritizePub(NitroAdjudicator.Outcome memory allocation, NitroAdjudicator.Outcome memory guarantee) public pure returns (NitroAdjudicator.Outcome memory) {
        return reprioritize(allocation, guarantee);
    }

    function affordsPub(address recipient, NitroAdjudicator.Outcome memory allocation, uint funding) public pure returns (uint256) {
        return affords(recipient, allocation, funding);
    }

    function reducePub(NitroAdjudicator.Outcome memory allocation, address recipient, uint amount, address token) public pure returns (NitroAdjudicator.Outcome memory) {
        return reduce(allocation, recipient, amount, token);
    }

    // ****************
    // Helper functions
    // ****************

    function isChannelClosedPub(address channel) public view returns (bool) {
        return isChannelClosed(channel);
    }

}