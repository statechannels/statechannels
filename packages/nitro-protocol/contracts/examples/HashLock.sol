// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../interfaces/IForceMoveApp.sol';
import '../Outcome.sol';

/**
 * @dev The HashLock contract complies with the ForceMoveApp interface and implements a time-limited hashlocked payment
 */
contract HashLock is IForceMoveApp {
    struct AppData {
        bytes32 h;
        bytes preImage;
    }

    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint48,
        uint256
    ) public override pure returns (bool) {
        // Decode variables.
        // Assumptions:
        //  - single asset in this channel
        //  - two parties in this channel
        //  - not a "guarantee" channel (c.f. Nitro paper)
        Outcome.AllocationItem[] memory allocationA = decode2PartyAllocation(a.outcome);
        Outcome.AllocationItem[] memory allocationB = decode2PartyAllocation(b.outcome);
        bytes memory preImage = abi.decode(b.appData, (AppData)).preImage;
        bytes32 h = abi.decode(a.appData, (AppData)).h;

        // is the preimage correct?
        require(keccak256(preImage) == h);

        // slots for each participant unchanged
        require(allocationA[0].destination == allocationB[0].destination);
        require(allocationA[1].destination == allocationB[1].destination);

        // was the payment made?
        require(allocationA[0].amount == allocationB[1].amount);
        require(allocationA[1].amount == allocationB[0].amount);

        return true;
    }

    function decode2PartyAllocation(bytes memory outcomeBytes)
        private
        pure
        returns (Outcome.AllocationItem[] memory allocation)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(outcomeBytes, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
    }
}
