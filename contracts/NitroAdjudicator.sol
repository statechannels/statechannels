pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMove.sol';
import './Outcome.sol';

contract AssetHolder {
    // abstraction of the parts of AssetHolder that we need
    function setOutcome(bytes32 channel, bytes32 outcomeHash) external;
}

contract NitroAdjudicator is ForceMove {
    function pushOutcome(
        bytes32 channelId,
        uint256 turnNumRecord,
        uint256 finalizesAt,
        bytes32 stateHash,
        address challengerAddress,
        bytes memory assetOutcomeBytes
    ) public {
        // requirements
        require(finalizesAt < now, 'Outcome is not final');

        bytes32 outcomeHash = keccak256(assetOutcomeBytes);

        require(
            keccak256(
                    abi.encode(
                        ChannelStorage(
                            turnNumRecord,
                            finalizesAt,
                            stateHash,
                            challengerAddress,
                            outcomeHash
                        )
                    )
                ) ==
                channelStorageHashes[channelId],
            'Submitted data does not match storage'
        );

        // effects
        bytes[] memory assetOutcomes = abi.decode(assetOutcomeBytes, (bytes[]));

        for (uint256 i = 0; i < assetOutcomes.length; i++) {
            Outcome.AssetOutcome memory assetOutcome = abi.decode(
                assetOutcomes[i],
                (Outcome.AssetOutcome)
            );
            AssetHolder(assetOutcome.assetHolderAddress).setOutcome(
                channelId,
                keccak256(assetOutcome.outcomeContent)
            );
        }

    }
}
