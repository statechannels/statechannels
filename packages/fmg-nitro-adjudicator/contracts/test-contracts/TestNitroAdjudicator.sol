pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;
import "fmg-core/contracts/Commitment.sol";
import "fmg-core/contracts/Rules.sol";
import "../NitroAdjudicator.sol";

contract TestNitroAdjudicator is NitroAdjudicator {
    using Commitment for Commitment.CommitmentStruct;
    
    constructor(address _NitroLibraryAddress) NitroAdjudicator(_NitroLibraryAddress) public {}  
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

    function setOutcome(address channel, INitroLibrary.Outcome memory outcome) public {
        outcomes[channel] = outcome;
    }

    function getOutcome(address channel) public view returns (INitroLibrary.Outcome memory) {
        return outcomes[channel];
    }

}