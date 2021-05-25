// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../interfaces/IForceMoveApp.sol';
import '../Outcome.sol';

/**
 * @dev The HashLockedSwap contract complies with the ForceMoveApp interface and implements a HashLockedSwaped payment
 */
contract HashLockedSwap is IForceMoveApp2 {
    struct AppData {
        bytes32 h;
        bytes preImage;
    }

    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint48 turnNumB,
        uint256,
        uint8
    ) public override pure returns (bool) {
        // is this the first and only swap?
        require(turnNumB == 4, 'turnNumB != 4');

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
        require(sha256(preImage) == h, 'Incorrect preimage');
        // NOTE ON GAS COSTS
        // The gas cost of hashing depends on the choice of hash function
        // and the length of the the preImage.
        // sha256 is twice as expensive as keccak256
        // https://ethereum.stackexchange.com/a/3200
        // But is compatible with bitcoin.

        // slots for each participant unchanged
        require(
            allocationA[0].destination == allocationB[0].destination &&
                allocationA[1].destination == allocationB[1].destination,
            'destinations may not change'
        );

        // was the payment made?
        require(
            allocationA[0].amount == allocationB[1].amount &&
                allocationA[1].amount == allocationB[0].amount,
            'amounts must be permuted'
        );

        return true;
    }

    function decode2PartyAllocation(bytes memory outcomeBytes)
        private
        pure
        returns (Outcome.AllocationItem[] memory allocation)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(outcomeBytes, (Outcome.OutcomeItem[]));

        // Throws if more than one asset
        require(outcome.length == 1, 'outcome: Only one asset allowed');

        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );

        // Throws unless the assetoutcome is an allocation
        require(
            assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),
            'AssetOutcome must be Allocation'
        );

        allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        // Throws unless there are exactly 2 allocations
        require(allocation.length == 2, 'allocation.length != 2');
    }
}
