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
        address token;
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
        address guaranteedChannelId;
        address[] destinations;
    }

    // function getAssetOutcome(bytes memory assetOutcomeBytes)
    //     public
    //     pure
    //     returns (AssetOutcome memory)
    // {
    //     return abi.decode(assetOutcomeBytes, (AssetOutcome));
    // }

    // function isAllocation(AssetOutcome memory assetOutcome) public pure returns (bool) {
    //     return assetOutcome.outcomeType == uint8(OutcomeType.Allocation);
    // }

    // // should have determined that isAllocation before calling
    // function getAllocation(bytes memory outcomeContent)
    //     public
    //     pure
    //     returns (AllocationItem[] memory)
    // {
    //     return abi.decode(outcomeContent, (AllocationItem[]));
    // }

    // function isGuarantee(AssetOutcome memory assetOutcome) public pure returns (bool) {
    //     return assetOutcome.outcomeType == uint8(OutcomeType.Guarantee);
    // }

    // // should have determined that isGuarantee before calling
    // function getGuarantee(bytes memory outcomeContent) public pure returns (Guarantee memory) {
    //     return abi.decode(outcomeContent, (Guarantee));
    // }

}
