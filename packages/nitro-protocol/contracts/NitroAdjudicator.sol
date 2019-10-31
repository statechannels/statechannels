pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './interfaces/Adjudicator.sol';
import './ForceMove.sol';
import './Outcome.sol';
import './AssetHolder.sol';

/**
  * @dev The NitroAdjudicator contract extends ForceMove and hence inherits all ForceMove methods, and also extends and implements the Adjudicator interface, allowing for a finalized outcome to be pushed to an asset holder.
*/
contract NitroAdjudicator is Adjudicator, ForceMove {
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
        uint256 turnNumRecord,
        uint256 finalizesAt,
        bytes32 stateHash,
        address challengerAddress,
        bytes memory outcomeBytes
    ) public {
        // requirements
        _requireChannelFinalized(channelId);

        bytes32 outcomeHash = keccak256(abi.encode(outcomeBytes));

        _requireMatchingStorage(
            ChannelStorage(
                turnNumRecord,
                finalizesAt,
                stateHash,
                challengerAddress,
                outcomeHash
            ),
            channelId
        );

        Outcome.OutcomeItem[] memory outcome = abi.decode(outcomeBytes, (Outcome.OutcomeItem[]));

        for (uint256 i = 0; i < outcome.length; i++) {
            require(
                AssetHolder(outcome[i].assetHolderAddress).setAssetOutcomeHash(
                    channelId,
                    keccak256(outcome[i].assetOutcomeBytes)
                )
            );
        }

    }
}
