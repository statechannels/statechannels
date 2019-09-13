pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

library Outcome {
    //An outcome is a set of asset outcomes.
    // Outcome = AssetOutcome[]
    // AssetOutome = (AssetID, AllocationOrGuarantee)
    // AllocationOrGuarantee = Allocation | Guarantee
    // Allocation = AllocationItem[]
    // AllocationItem = (Destination, Amount)
    // Guarantee = (ChannelAddress, Destination[])
    // Destination = ChannelAddress | ExternalAddress

    struct AssetOutcome {
        address assetHolderAddress;
        bytes outcomeContent; // abi.encode(LabelledAllocationOrGuarantee)
    }

    enum OutcomeType {Allocation, Guarantee}

    struct LabelledAllocationOrGuarantee {
        uint8 outcomeType; // OutcomeType.Allocation or OutcomeType.Guarantee
        bytes allocationOrGuarantee; // abi.encode(AllocationItem[])  or abi.encode(Guarantee), depending on OutcomeType
    }

    // reserve Allocation to refer to AllocationItem[]
    struct AllocationItem {
        bytes32 destination;
        uint256 amount;
    }

    struct Guarantee {
        bytes32 targetChannelId;
        bytes32[] destinations;
    }

}
