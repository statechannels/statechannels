// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../Outcome.sol';
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
// As version 0 but make it so the channel id is the adjudicator address, by deploying via an on chain factory

contract SingleChannelAdjudicator {
    mapping(bytes32 => bytes32) public statusOf;

    bytes32 public cId;
    bytes32 public status;

    constructor(bytes32 _cId) {
        cId = _cId;
    }

    struct FixedPart {
        uint256 chainId;
        address[] participants;
        uint48 channelNonce;
        address appDefinition;
        uint48 challengeDuration;
    }

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    enum ChannelMode {Open, Challenge, Finalized}

    struct State {
        // participants sign the hash of this
        uint48 turnNum;
        bool isFinal;
        bytes32 channelId; // keccack(chainId,participants,channelNonce)
        bytes32 appPartHash;
        //     keccak256(abi.encode(
        //         fixedPart.challengeDuration,
        //         fixedPart.appDefinition,
        //         variablePart.appData
        //     )
        // )
        bytes32 outcomeHash;
    }

    struct ChannelData {
        uint48 turnNumRecord;
        uint48 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash;
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
        _conclude(
            largestTurnNum,
            fixedPart,
            appPartHash,
            outcomeHash,
            numStates,
            whoSignedWhat,
            sigs
        );
        _transferAllAssets(outcomeBytes);
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
     * @notice Finalizes a channel by providing a finalization proof. Internal method.
     * @dev Finalizes a channel by providing a finalization proof. Internal method.
     * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
     * @param fixedPart Data describing properties of the state channel that do not change with state updates.
     * @param appPartHash The keccak256 of the abi.encode of `(challengeDuration, appDefinition, appData)`. Applies to all states in the finalization proof.
     * @param outcomeHash The keccak256 of the `outcome`. Applies to all stats in the finalization proof.
     * @param numStates The number of states in the finalization proof.
     * @param whoSignedWhat An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.
     * @param sigs An array of signatures that support the state with the `largestTurnNum`.
     */
    function _conclude(
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
        _requireChannelNotFinalized();

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
        status = _generateStatus(
            ChannelData(0, uint48(block.timestamp), bytes32(0), address(0), outcomeHash) //solhint-disable-line not-rely-on-time
        );
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
        require(channelId == cId, 'Wrong channelId for this adjudicator');
    }

    /**
     * @notice Checks that this channel is NOT in the Finalized mode.
     * @dev Checks that this channel is in the Challenge mode.
     */
    function _requireChannelNotFinalized() internal view {
        require(_mode() != ChannelMode.Finalized, 'Channel finalized.');
    }

    /**
     * @notice Computes the ChannelMode for this channel.
     * @dev Computes the ChannelMode for this channel.
     */
    function _mode() internal view returns (ChannelMode) {
        // Note that _unpackStatus() returns (0,0,0), which is
        // correct when nobody has written to storage yet.

        (, uint48 finalizesAt, ) = _unpackStatus();
        if (finalizesAt == 0) {
            return ChannelMode.Open;
            // solhint-disable-next-line not-rely-on-time
        } else if (finalizesAt <= block.timestamp) {
            return ChannelMode.Finalized;
        } else {
            return ChannelMode.Challenge;
        }
    }

    function _unpackStatus()
        internal
        view
        returns (
            uint48 turnNumRecord,
            uint48 finalizesAt,
            uint160 fingerprint
        )
    {
        uint16 cursor = 256;
        turnNumRecord = uint48(uint256(status) >> (cursor -= 48));
        finalizesAt = uint48(uint256(status) >> (cursor -= 48));
        fingerprint = uint160(uint256(status));
    }

    /**
     * @notice Validates input for several external methods.
     * @dev Validates input for several external methods.
     * @param numParticipants Length of the participants array
     * @param numStates Number of states submitted
     * @param numSigs Number of signatures submitted
     * @param numWhoSignedWhats whoSignedWhat.length
     */
    function requireValidInput(
        uint256 numParticipants,
        uint256 numStates,
        uint256 numSigs,
        uint256 numWhoSignedWhats
    ) public pure returns (bool) {
        require((numParticipants >= numStates) && (numStates > 0), 'Insufficient or excess states');
        require(
            (numSigs == numParticipants) && (numWhoSignedWhats == numParticipants),
            'Bad |signatures|v|whoSignedWhat|'
        );
        require(numParticipants < type(uint8).max, 'Too many participants!');
        return true;
    }

    /**
     * @notice Computes the unique id of a channel.
     * @dev Computes the unique id of a channel.
     * @param fixedPart Part of the state that does not change
     * @return channelId
     */
    function _getChannelId(FixedPart memory fixedPart) internal pure returns (bytes32 channelId) {
        require(fixedPart.chainId == getChainID(), 'Incorrect chainId');
        channelId = keccak256(
            abi.encode(getChainID(), fixedPart.participants, fixedPart.channelNonce)
        );
    }

    /**
     * @notice Given an array of state hashes, checks the validity of the supplied signatures. Valid means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.
     * @dev Given an array of state hashes, checks the validity of the supplied signatures. Valid means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.
     * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
     * @param participants A list of addresses representing the participants of a channel.
     * @param stateHashes Array of keccak256(State) submitted in support of a state,
     * @param sigs Array of Signatures, one for each participant
     * @param whoSignedWhat participant[i] signed stateHashes[whoSignedWhat[i]]
     * @return true if the signatures are valid, false otherwise
     */
    function _validSignatures(
        uint48 largestTurnNum,
        address[] memory participants,
        bytes32[] memory stateHashes,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat // whoSignedWhat[i] is the index of the state in stateHashes that was signed by participants[i]
    ) internal pure returns (bool) {
        uint256 nParticipants = participants.length;
        uint256 nStates = stateHashes.length;

        require(
            _acceptableWhoSignedWhat(whoSignedWhat, largestTurnNum, nParticipants, nStates),
            'Unacceptable whoSignedWhat array'
        );
        for (uint256 i = 0; i < nParticipants; i++) {
            address signer = _recoverSigner(stateHashes[whoSignedWhat[i]], sigs[i]);
            if (signer != participants[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice Given a declaration of which state in the support proof was signed by which participant, check if this declaration is acceptable. Acceptable means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.
     * @dev Given a declaration of which state in the support proof was signed by which participant, check if this declaration is acceptable. Acceptable means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.
     * @param whoSignedWhat participant[i] signed stateHashes[whoSignedWhat[i]]
     * @param largestTurnNum Largest turnNum of the support proof
     * @param nParticipants Number of participants in the channel
     * @param nStates Number of states in the support proof
     * @return true if whoSignedWhat is acceptable, false otherwise
     */
    function _acceptableWhoSignedWhat(
        uint8[] memory whoSignedWhat,
        uint48 largestTurnNum,
        uint256 nParticipants,
        uint256 nStates
    ) internal pure returns (bool) {
        require(whoSignedWhat.length == nParticipants, '|whoSignedWhat|!=nParticipants');
        for (uint256 i = 0; i < nParticipants; i++) {
            uint256 offset = (nParticipants + largestTurnNum - i) % nParticipants;
            // offset is the difference between the index of participant[i] and the index of the participant who owns the largesTurnNum state
            // the additional nParticipants in the dividend ensures offset always positive
            if (whoSignedWhat[i] + offset + 1 < nStates) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice Formats the input data for on chain storage.
     * @dev Formats the input data for on chain storage.
     * @param channelData ChannelData data.
     */
    function _generateStatus(ChannelData memory channelData)
        internal
        pure
        returns (bytes32 _status)
    {
        // The hash is constructed from left to right.
        uint256 result;
        uint16 cursor = 256;

        // Shift turnNumRecord 208 bits left to fill the first 48 bits
        result = uint256(channelData.turnNumRecord) << (cursor -= 48);

        // logical or with finalizesAt padded with 160 zeros to get the next 48 bits
        result |= (uint256(channelData.finalizesAt) << (cursor -= 48));

        // logical or with the last 160 bits of the hash the remaining channelData fields
        // (we call this the fingerprint)
        result |= uint256(
            uint160(
                uint256(
                    keccak256(
                        abi.encode(
                            channelData.stateHash,
                            channelData.challengerAddress,
                            channelData.outcomeHash
                        )
                    )
                )
            )
        );

        _status = bytes32(result);
    }

    /**
     * @dev Indicates that a challenge has been registered against `channelId`.
     * @param channelId Unique identifier for a state channel.
     * @param finalizesAt The unix timestamp when `channelId` finalized.
     */
    event Concluded(bytes32 indexed channelId, uint48 finalizesAt);

    function getChainID() public pure returns (uint256) {
        uint256 id;
        /* solhint-disable no-inline-assembly */
        assembly {
            id := chainid()
        }
        /* solhint-disable no-inline-assembly */
        return id;
    }

    /**
     * @notice Given a digest and ethereum digital signature, recover the signer
     * @dev Given a digest and digital signature, recover the signer
     * @param _d message digest
     * @param sig ethereum digital signature
     * @return signer
     */
    function _recoverSigner(bytes32 _d, Signature memory sig) internal pure returns (address) {
        bytes32 prefixedHash = keccak256(abi.encodePacked('\x19Ethereum Signed Message:\n32', _d));
        address a = ecrecover(prefixedHash, sig.v, sig.r, sig.s);
        require(a != address(0), 'Invalid signature');
        return (a);
    }
}
