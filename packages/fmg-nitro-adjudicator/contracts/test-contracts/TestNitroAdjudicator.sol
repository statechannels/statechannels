pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;
import "fmg-core/contracts/State.sol";
import "fmg-core/contracts/Rules.sol";
import "../NitroAdjudicator.sol";

contract TestNitroAdjudicator is NitroAdjudicator {
    using State for State.StateStruct;

    function reprioritizePub(Outcome memory outcome, Guarantee memory guarantee) public pure returns (Outcome memory) {
        return reprioritize(outcome, guarantee);
    }

    function overlapPub(address recipient, Outcome memory outcome, uint funding) public pure returns (uint256) {
        return overlap(recipient, outcome, funding);
    }

    function removePub(Outcome memory outcome, address recipient, uint amount) public pure returns (Outcome memory) { 
        return remove(outcome, recipient, amount);
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

    function channelId(State.StateStruct memory state) public pure returns (address) {
        return state.channelId();
    }

    function outcomeFinal(address channel) public view returns (bool) {
        return outcomes[channel].finalizedAt > 0 && outcomes[channel].finalizedAt < now;
    }

    function setOutcome(address channel, Outcome memory outcome) public {
        // Temporary helper function to set outcomes for testing

        require(
            outcome.destination.length == outcome.amount.length,
            "destination.length must be equal to amount.length"
        );

        outcomes[channel] = outcome;
    }

    function getOutcome(address channel) public view returns (Outcome memory) {
        return outcomes[channel];
    }

}