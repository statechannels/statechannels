pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMove.sol';
import './Outcome.sol';

contract AssetHolder {
    // abstraction of the parts of AssetHolder that we need
    function setAssetOutcomeHash(bytes32 channel, bytes32 outcomeHash) external returns (bool success);
}

contract NitroAdjudicator is ForceMove {
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
