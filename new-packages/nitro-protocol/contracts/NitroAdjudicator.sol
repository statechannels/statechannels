pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMove.sol';

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
        bytes memory outcome,
        address assetHolder
    ) public {
        // requirements
        require(finalizesAt < now, 'Outcome is not final');

        bytes32 outcomeHash = keccak256(abi.encode(outcome));
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
        AssetHolder(assetHolder).setOutcome(channelId, outcomeHash);
    }
}
