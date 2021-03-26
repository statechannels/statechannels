// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../ForceMove.sol';
import '../Outcome.sol';
import './AdjudicatorFactory.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

// Have a an adjudicator per channel, which is only deployed when assets are paid out.
// Transfers are always external: they always pay out to an ethereum address (since channels have ethereum address now)
// Version 0:

// 1. Deploy a per-channel adjudicator with a baked in channel id stored on it.
// 2. Fund it by transferring some ERC20s to the singlechanneladjudicator address.
// 3. Construct a conclusion proof and call concludePushOutcomeAndTransferAll
// 4. Asset that the correct EOA token balances are correct.

// Version 1:
//
// As version 0 but make it so the channel "address" is the adjudicator address (and uniquely derived from the channel id)
//, by deploying via an on chain factory

contract SingleChannelAdjudicator is ForceMove {
    address public immutable adjudicatorFactoryAddress;

    constructor(address a) {
        adjudicatorFactoryAddress = a;
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
}
