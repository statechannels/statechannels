// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../interfaces/IForceMoveApp.sol';
import '../Outcome.sol';
import '../interfaces/IForceMove.sol';

/**
 * @dev The HashLockedSwap contract complies with the ForceMoveApp interface and implements a HashLockedSwaped payment
 */
contract TwoOfThree is IForceMoveApp2 {
    struct AppData {
        IForceMoveApp2 twoPartyApp;
        bytes twoPartyAppData;
    }

    function validTransition(
        VariablePart memory a, // TODO consider less confusing variable names
        VariablePart memory b,
        uint48 turnNumB,
        uint256 nParticipants,
        uint8 signedBy // Who has signed state b?
    ) public override pure returns (bool) {
        // If the new state is signed by all three participants, it is automatically considered a valid transition
        if (signedBy == 7) return true;
        if (signedBy == 0) return false;
        if (signedBy < 4) {
            // participant 2 has not signed
            AppData memory aAppData = abi.decode(a.appData, (AppData));
            AppData memory bAppData = abi.decode(b.appData, (AppData));

            // Decode variables.
            // Assumptions:
            //  - single asset in this channel
            //  - three parties in this channel
            (
                Outcome.AllocationItem[] memory allocationA,
                address aAssetHolderAddress
            ) = decode3PartyAllocation(a.outcome);
            (
                Outcome.AllocationItem[] memory allocationB,
                address bAssetHolderAddress
            ) = decode3PartyAllocation(b.outcome);

            // slots for each participant unchanged
            require(
                allocationA[0].destination == allocationB[0].destination &&
                    allocationA[1].destination == allocationB[1].destination &&
                    allocationA[2].destination == allocationB[2].destination,
                'destinations may not change'
            );

            // participant 2's slot may not change
            require(
                allocationA[2].amount == allocationB[2].amount,
                'amount for participant 2 cannot change without their signature'
            );

            // slice off the two party outcome and data
            VariablePart memory a2 = VariablePart(
                encode2PartyAllocation(allocationA[0], allocationA[1], aAssetHolderAddress),
                aAppData.twoPartyAppData
            );
            VariablePart memory b2 = VariablePart(
                encode2PartyAllocation(allocationB[0], allocationB[1], bAssetHolderAddress),
                bAppData.twoPartyAppData
            );

            return bAppData.twoPartyApp.validTransition(a2, b2, turnNumB, 2, signedBy);
        } else return false;
    }

    // TODO write a reusable decodeNPartyAllocation fn
    function decode3PartyAllocation(bytes memory outcomeBytes)
        private
        pure
        returns (Outcome.AllocationItem[] memory allocation, address assetHolderAddress)
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
        assetHolderAddress = outcome[0].assetHolderAddress;

        // Throws unless there are exactly 3 allocations
        require(allocation.length == 3, 'allocation.length != 3');
    }

    function encode2PartyAllocation(
        Outcome.AllocationItem memory firstAllocationItem,
        Outcome.AllocationItem memory secondAllocationItem,
        address assetHolderAddress
    ) private pure returns (bytes memory outcomeBytes) {
        Outcome.AllocationItem[] memory allocation = new Outcome.AllocationItem[](2);
        allocation[0] = firstAllocationItem;
        allocation[1] = secondAllocationItem;
        bytes memory allocationBytes = abi.encode(allocation);
        bytes memory assetOutcomeBytes = abi.encode(
            Outcome.AssetOutcome(uint8(Outcome.AssetOutcomeType.Allocation), allocationBytes)
        );
        Outcome.OutcomeItem[] memory outcome = new Outcome.OutcomeItem[](1);
        outcome[0] = Outcome.OutcomeItem(assetHolderAddress, assetOutcomeBytes);
        outcomeBytes = abi.encode(outcome);
    }
}
