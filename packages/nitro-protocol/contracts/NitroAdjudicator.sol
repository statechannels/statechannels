pragma solidity ^0.6.0;
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
        uint48 finalizesAt,
        bytes32 stateHash,
        address challengerAddress,
        bytes memory outcomeBytes
    ) public override {
        // requirements
        _requireChannelFinalized(channelId);

        bytes32 outcomeHash = keccak256(abi.encode(outcomeBytes));

        _requireMatchingStorage(
            ChannelData(turnNumRecord, finalizesAt, stateHash, challengerAddress, outcomeHash),
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

    /**
     * @notice Allows a finalized channel's outcome to be decoded and transferAll to be triggered in external Asset Holder contracts.
     * @dev Allows a finalized channel's outcome to be decoded and one or more AssetOutcomes registered in external Asset Holder contracts.
     * @param channelId Unique identifier for a state channel
     * @param turnNumRecord A turnNum that (the adjudicator knows and stores) is supported by a signature from each participant.
     * @param finalizesAt The unix timestamp when this channel will finalize
     * @param stateHash The keccak256 of the abi.encode of the State (struct) stored by the adjudicator
     * @param challengerAddress The address of the participant whom registered the challenge, if any.
     * @param outcomeBytes The encoded Outcome of this state channel.
     */
    function pushOutcomeAndTransferAll(
        bytes32 channelId,
        uint256 turnNumRecord,
        uint48 finalizesAt,
        bytes32 stateHash,
        address challengerAddress,
        bytes memory outcomeBytes
    ) public {
        // requirements
        _requireChannelFinalized(channelId);

        bytes32 outcomeHash = keccak256(abi.encode(outcomeBytes));

        _requireMatchingStorage(
            ChannelData(turnNumRecord, finalizesAt, stateHash, challengerAddress, outcomeHash),
            channelId
        );

        _transferAllFromAllAssetHolders(channelId, outcomeBytes);
    }

    /**
     * @notice Finalizes a channel by providing a finalization proof, allows a finalized channel's outcome to be decoded and transferAll to be triggered in external Asset Holder contracts.
     * @dev Finalizes a channel by providing a finalization proof, allows a finalized channel's outcome to be decoded and transferAll to be triggered in external Asset Holder contracts.
     * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
     * @param fixedPart Data describing properties of the state channel that do not change with state updates.
     * @param appPartHash The keccak256 of the abi.encode of `(challengeDuration, appDefinition, appData)`. Applies to all states in the finalization proof.
     * @param outcomeBytes abi.encode of an array of Outcome.OutcomeItem structs.
     * @param numStates The number of states in the finalization proof.
     * @param whoSignedWhat An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.
     * @param sigs An array of signatures that support the state with the `largestTurnNum`.
     */
    function concludePushOutcomeAndTransferAll(
        uint48 largestTurnNum,
        FixedPart memory fixedPart,
        bytes32 appPartHash,
        bytes memory outcomeBytes,
        uint8 numStates,
        uint8[] memory whoSignedWhat,
        Signature[] memory sigs
    ) public {
        // requirements
        bytes32 channelId = _getChannelId(fixedPart);

        _requireChannelNotFinalized(channelId);

        // By construction, the following states form a valid transition
        bytes32[] memory stateHashes = new bytes32[](numStates);

        bytes32 outcomeHash = keccak256(abi.encode(outcomeBytes));
        for (uint256 i = 0; i < numStates; i++) {
            stateHashes[i] = keccak256(
                abi.encode(
                    State(
                        largestTurnNum + (i + 1) - numStates, // turnNum
                        true, // isFinal
                        channelId,
                        appPartHash,
                        outcomeHash
                    )
                )
            );
        }

        require(
            _validSignatures(
                largestTurnNum,
                fixedPart.participants,
                stateHashes,
                sigs,
                whoSignedWhat
            ),
            'Invalid signatures'
        );

        // effects

        channelStorageHashes[channelId] = _hashChannelData(
            ChannelData(0, now, bytes32(0), address(0), outcomeHash)
        );
        emit Concluded(channelId);

        _transferAllFromAllAssetHolders(channelId, outcomeBytes);
    }

    /**
     * @notice Triggers transferAll in all external Asset Holder contracts specified in a given outcome for a given channelId.
     * @dev Triggers transferAll in  all external Asset Holder contracts specified in a given outcome for a given channelId.
     * @param channelId Unique identifier for a state channel
     * @param outcomeBytes abi.encode of an array of Outcome.OutcomeItem structs.
     */
    function _transferAllFromAllAssetHolders(bytes32 channelId, bytes memory outcomeBytes)
        internal
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(outcomeBytes, (Outcome.OutcomeItem[]));

        for (uint256 i = 0; i < outcome.length; i++) {
            Outcome.AssetOutcome memory assetOutcome = abi.decode(
                outcome[i].assetOutcomeBytes,
                (Outcome.AssetOutcome)
            );
            if (assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation)) {
                AssetHolder(outcome[i].assetHolderAddress).transferAllAdjudicatorOnly(
                    channelId,
                    assetOutcome.allocationOrGuaranteeBytes
                );
            } else {
                revert();
            }
        }
    }

    /**
    * @notice Check that the submitted pair of states form a valid transition (public wrapper for internal function _requireValidTransition)
    * @dev Check that the submitted pair of states form a valid transition (public wrapper for internal function _requireValidTransition)
    * @param nParticipants Number of participants in the channel.
    transition
    * @param isFinalAB Pair of booleans denoting whether the first and second state (resp.) are final.
    * @param ab Variable parts of each of the pair of states
    * @param turnNumB turnNum of the later state of the pair.
    * @param appDefinition Address of deployed contract containing application-specific validTransition function.
    * @return true if the later state is a validTransition from its predecessor, reverts otherwise.
    */
    function validTransition(
        uint256 nParticipants,
        bool[2] memory isFinalAB, // [a.isFinal, b.isFinal]
        ForceMoveApp.VariablePart[2] memory ab, // [a,b]
        uint256 turnNumB,
        address appDefinition
    ) public pure returns (bool) {
        return _requireValidTransition(nParticipants, isFinalAB, ab, turnNumB, appDefinition);
    }
}
