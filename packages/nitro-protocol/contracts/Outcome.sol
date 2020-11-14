// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

library Outcome {
    //An outcome is an array of OutcomeItems
    // Outcome = OutcomeItem[]
    // OutcomeItem = (AssetHolderAddress, AssetOutcome)
    // AssetOutcome = (AssetOutcomeType, Allocation | Guarantee)
    // Allocation = AllocationItem[]
    // AllocationItem = (Destination, Amount)
    // Guarantee = (ChannelAddress, Destination[])
    // Destination = ChannelAddress | ExternalDestination

    struct OutcomeItem {
        address assetHolderAddress;
        bytes assetOutcomeBytes; // abi.encode(AssetOutcome)
    }

    enum AssetOutcomeType {Allocation, Guarantee}

    struct AssetOutcome {
        uint8 assetOutcomeType; // AssetOutcomeType.Allocation or AssetOutcomeType.Guarantee
        bytes allocationOrGuaranteeBytes; // abi.encode(AllocationItem[]) or abi.encode(Guarantee), depending on OutcomeType
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
