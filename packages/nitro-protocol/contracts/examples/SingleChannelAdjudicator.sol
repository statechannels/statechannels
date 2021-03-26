// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../ForceMove.sol';
import '../Outcome.sol';
import './AdjudicatorFactory.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract SingleChannelAdjudicator is ForceMove {
    address public immutable adjudicatorFactoryAddress;

    constructor(address a) {
        adjudicatorFactoryAddress = a;
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
        // TODO rename this. We no longer have a notion of pushing an outcome
        bytes32 channelId,
        uint48 turnNumRecord,
        uint48 finalizesAt,
        bytes32 stateHash,
        address challengerAddress,
        bytes memory outcomeBytes
    ) public {
        // requirements
        _requireChannelFinalized(channelId);

        bytes32 outcomeHash = keccak256(outcomeBytes);

        _requireMatchingStorage(
            ChannelData(turnNumRecord, finalizesAt, stateHash, challengerAddress, outcomeHash),
            channelId
        );

        _transferAllAssets(outcomeBytes);
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
        bytes32 outcomeHash = keccak256(outcomeBytes);
        _ninjaConclude(
            largestTurnNum,
            fixedPart,
            appPartHash,
            outcomeHash,
            numStates,
            whoSignedWhat,
            sigs
        );
        _transferAllAssets(outcomeBytes);
        selfdestruct(address(0));
    }

    /**
     * @notice Triggers transferAll in all external Asset Holder contracts specified in a given outcome for a given channelId.
     * @dev Triggers transferAll in  all external Asset Holder contracts specified in a given outcome for a given channelId.
     * @param outcomeBytes abi.encode of an array of Outcome.OutcomeItem structs.
     */
    function _transferAllAssets(bytes memory outcomeBytes) internal {
        Outcome.OutcomeItem[] memory outcome = abi.decode(outcomeBytes, (Outcome.OutcomeItem[]));

        // loop over tokens
        for (uint256 i = 0; i < outcome.length; i++) {
            Outcome.AssetOutcome memory assetOutcome = abi.decode(
                outcome[i].assetOutcomeBytes,
                (Outcome.AssetOutcome)
            );

            if (assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation)) {
                Outcome.AllocationItem[] memory allocation = abi.decode(
                    assetOutcome.allocationOrGuaranteeBytes,
                    (Outcome.AllocationItem[])
                );

                // loop over payouts for this token
                for (uint256 j = 0; j < allocation.length; j++) {
                    IERC20(outcome[i].assetHolderAddress).transfer(
                        _bytes32ToAddress(allocation[j].destination),
                        allocation[j].amount
                    );
                }
            } else {
                revert('AssetOutcome not an allocation');
            }
        }
    }

    /**
     * @notice Finalizes a channel by providing a finalization proof. Internal method. Does not touch storage.
     * @dev Finalizes a channel by providing a finalization proof. Internal method. Does not touch storage.
     * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
     * @param fixedPart Data describing properties of the state channel that do not change with state updates.
     * @param appPartHash The keccak256 of the abi.encode of `(challengeDuration, appDefinition, appData)`. Applies to all states in the finalization proof.
     * @param outcomeHash The keccak256 of the `outcome`. Applies to all stats in the finalization proof.
     * @param numStates The number of states in the finalization proof.
     * @param whoSignedWhat An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.
     * @param sigs An array of signatures that support the state with the `largestTurnNum`.
     */
    function _ninjaConclude(
        uint48 largestTurnNum,
        FixedPart memory fixedPart,
        bytes32 appPartHash,
        bytes32 outcomeHash,
        uint8 numStates,
        uint8[] memory whoSignedWhat,
        Signature[] memory sigs
    ) internal returns (bytes32 channelId) {
        channelId = _getChannelId(fixedPart);
        _requireChannelIdMatchesContract(channelId);
        _requireChannelNotFinalized(channelId);

        // input type validation
        requireValidInput(
            fixedPart.participants.length,
            numStates,
            sigs.length,
            whoSignedWhat.length
        );

        require(largestTurnNum + 1 >= numStates, 'largestTurnNum too low');
        // ^^ SW-C101: prevent underflow

        // By construction, the following states form a valid transition
        bytes32[] memory stateHashes = new bytes32[](numStates);
        for (uint48 i = 0; i < numStates; i++) {
            stateHashes[i] = keccak256(
                abi.encode(
                    State(
                        largestTurnNum + (i + 1) - numStates, // turnNum
                        // ^^ SW-C101: It is not easy to use SafeMath here, since we are not using uint256s
                        // Instead, we are protected by the require statement above
                        true, // isFinal
                        channelId,
                        appPartHash,
                        outcomeHash
                    )
                )
            );
        }

        // checks
        require(
            _validSignatures(
                largestTurnNum,
                fixedPart.participants,
                stateHashes,
                sigs,
                whoSignedWhat
            ),
            'Invalid signatures / !isFinal'
        );

        // effects

        emit Concluded(channelId, uint48(block.timestamp)); //solhint-disable-line not-rely-on-time
    }

    /**
     * @notice Converts a nitro destination to an ethereum address.
     * @dev Converts a nitro destination to an ethereum address.
     * @param destination The destination to be converted.
     * @return The rightmost 160 bits of the input string.
     */
    function _bytes32ToAddress(bytes32 destination) internal pure returns (address payable) {
        return address(uint160(uint256(destination)));
    }

    function _requireChannelIdMatchesContract(bytes32 channelId) internal view {
        // the placeholderFactory will be replaced with the address of the real AdjudicatorFactory
        // at deploy time (it will be linked).
        require(
            AdjudicatorFactory(adjudicatorFactoryAddress).getChannelAddress(channelId) ==
                address(this),
            'Wrong channelId'
        );
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
        IForceMoveApp.VariablePart[2] memory ab, // [a,b]
        uint48 turnNumB,
        address appDefinition
    ) public pure returns (bool) {
        return _requireValidTransition(nParticipants, isFinalAB, ab, turnNumB, appDefinition);
    }
}
