pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;
import "fmg-core/contracts/Commitment.sol";
import "fmg-core/contracts/Rules.sol";
import "../NitroAdjudicator.sol";

contract TestNitroAdjudicator is NitroAdjudicator {
    using Commitment for Commitment.CommitmentStruct;

    function reprioritizePub(Outcome memory allocation, Outcome memory guarantee) public pure returns (Outcome memory) {
        return reprioritize(allocation, guarantee);
    }

    function affordsPub(address recipient, Outcome memory allocation, uint funding) public pure returns (uint256) {
        return affords(recipient, allocation, funding);
    }

    function reducePub(Outcome memory allocation, address recipient, uint amount) public pure returns (Outcome memory) {
        return reduce(allocation, recipient, amount);
    }

    // ****************
    // Helper functions
    // ****************

    function isChannelClosedPub(address channel) public view returns (bool) {
        return isChannelClosed(channel);
    }

    // *********************************
    // Test helper functions
    // *********************************

    function isChallengeOngoing(address channel) public view returns (bool) {
        return outcomes[channel].finalizedAt > now;
    }

    function channelId(Commitment.CommitmentStruct memory commitment) public pure returns (address) {
        return commitment.channelId();
    }

    function outcomeFinal(address channel) public view returns (bool) {
        return outcomes[channel].finalizedAt > 0 && outcomes[channel].finalizedAt < now;
    }

    function setOutcome(address channel, Outcome memory outcome) public {
        outcomes[channel] = outcome;
    }

    function getOutcome(address channel) public view returns (Outcome memory) {
        return outcomes[channel];
    }

}