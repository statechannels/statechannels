// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../interfaces/IForceMoveApp.sol';
import '../Outcome.sol';
import '../interfaces/IForceMove.sol';

/**
 * @dev The XinJ contract embeds a subchannel
 */
contract XinJ is
    IForceMoveApp2 // We need a new interface to allow signedBy information into the validTransition function
{
    struct SupportProof {
        FixedPart fixedPart;
        VariablePart[] variableParts;
        Signature[] sigs;
    }

    enum AlreadyMoved {A, B, AB, ABC}

    struct AppData {
        bytes32 channelIdForX;
        SupportProof supportProofForX;
        AlreadyMoved alreadyMoved;
    }

    function validTransition(
        VariablePart memory from,
        VariablePart memory to,
        uint48 turnNumTo,
        uint256,
        bool signedByA, // Who has signed the "to" state?
        bool signedByB // Who has signed the "to" state?
    ) public override pure returns (bool) {
        AppData memory fromAppData = abi.decode(from.appData, (AppData));
        AppData memory toAppData = abi.decode(to.appData, (AppData));

        // Decode variables.
        // Assumptions:
        //  - single asset in this channel
        //  - three parties in this channel
        (
            Outcome.AllocationItem[] memory fromAllocation,
            address fromAssetHolderAddress
        ) = decode3PartyAllocation(from.outcome);
        (
            Outcome.AllocationItem[] memory toAllocation,
            address toAssetHolderAddress
        ) = decode3PartyAllocation(to.outcome);

        // slots for each participant unchanged
        require(
            fromAllocation[0].destination == toAllocation[0].destination &&
                fromAllocation[1].destination == toAllocation[1].destination &&
                fromAllocation[2].destination == toAllocation[2].destination,
            'destinations may not change'
        );

        // participant 2's slot may not change
        require(fromAllocationA[2].amount == toAllocationB[2].amount, 'p2.amt constant');

        // Allowed transitions are
        //    AB
        //    ^^
        //   /  \
        // A      B
        // ^      ^
        //  \    /
        //    ABC

        if (fromAppData.alreadyMoved == AlreadyMoved.ABC) {
            require(
                (toAppData.alreadyMoved == AlreadyMoved.A && signedByA) ||
                    (toAppData.alreadyMoved == AlreadyMoved.B && signedByB)
            );
        } else if (fromAppData.alreadyMoved == AlreadyMoved.A) {
            require(toAppData.alreadyMoved == AlreadyMoved.AB && signedByB);
        } else if (fromAppData.alreadyMoved == AlreadyMoved.B) {
            require(toAppData.alreadyMoved == AlreadyMoved.AB && signedByA);
        }

        Outcome.AllocationItem[] memory Xallocation = requireHighestSupportedXState(
            fromAppData,
            toAppData
        );

        requireEmbeddedChannelIsValid(from, to);

        require(
            Xallocation[0].amount == toAllocation[0].amount &&
                Xallocation[1].amount == toAllocation[1].amount &&
                Xallocation[0].destination == toAllocation[0].destiantion &&
                Xallocation[1].destination == toAllocation[1].destiantion
        );
        return true;
    }

    function requireEmbeddedChannelIsValid(
        VariablePart memory from,
        VariablePart memory to,
        AppData memory fromAppData,
        AppData memory toAppData
    ) internal pure {
        require(
            fromAppData.supportProofForX.fixedPart.appDefinition ==
                toAppData.supportProofForX.fixedPart.appDefinition
        );
        require(
            fromAppData.supportProofForX.fixedPart.challengeDuration ==
                toAppData.supportProofForX.fixedPart.challengeDuration
        ); // TODO this is actually never used so could be 0
        // TODO require channel id of the fixed part of the support proof for X matches toAppData.channelIdForX, and check this hasn't been changed.
    }

    function requireHighesSupportedXState(AppData memory fromAppData, AppData memory toAppData)
        internal
        view
        returns (Outcome.AllocationItem[] memory Xallocation)
    {
        // TODO escape hatch for doubly-signed states. For now we restrict to turn-taking in X.
        // TODO requireCorrectSignaturesInSupportProofForX;
        require(
            toAppData.rulesForX.validTransition(
                toAppData.supportProofForX.states[0],
                toAppData.supportProofForX.states[1]
            )
        );
        require(
            toAppData.supportProofForX.states[1].turnNum >=
                fromAppData.supportProofForX.states[1].turnNum
        );
        return decode2PartyAllocation(toAppData.supportProofForX.states[1].outcome);
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
