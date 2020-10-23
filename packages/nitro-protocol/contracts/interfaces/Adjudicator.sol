// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @dev An Adjudicator Interface calls for a method that allows a finalized outcome to be pushed to an asset holder.
 */
interface Adjudicator {
    /**
     * @notice Allows a finalized channel's outcome to be decoded and one or more AssetOutcomes registered in external Asset Holder contracts.
     * @dev Allows a finalized channel's outcome to be decoded and one or more AssetOutcomes registered in external Asset Holder contracts.
     * @param channelId Unique identifier for a state channel
     * @param turnNumRecord A turnNum that (the adjudicator knows and stores) is supported by a signature from each participant.
     * @param finalizesAt The unix timestamp when this channel will finalize
     * @param stateHash The keccak256 of the abi.encode of the State (struct) stored by the adjudicator
     * @param challengerAddress The address of the participant whom registered the challenge, if any.
     * @param outcomeBytes The encoded Outcome of this state channel.
     */
    function pushOutcome(
        bytes32 channelId,
        uint48 turnNumRecord,
        uint48 finalizesAt,
        bytes32 stateHash,
        address challengerAddress,
        bytes calldata outcomeBytes
    ) external;
}
