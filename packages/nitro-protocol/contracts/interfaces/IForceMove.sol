// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';

/**
 * @dev The IForceMove contract abstraction defines the interface that an implementation of ForceMove should implement. ForceMove protocol allows state channels to be adjudicated and finalized.
 */
abstract contract IForceMove {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct FixedPart {
        uint256 chainId;
        address[] participants;
        uint48 channelNonce;
        address appDefinition;
        uint48 challengeDuration;
    }

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

    enum ChannelMode {Open, Challenge, Finalized}

    /**
     * @notice Registers a challenge against a state channel. A challenge will either prompt another participant into clearing the challenge (via one of the other methods), or cause the channel to finalize at a specific time.
     * @dev Registers a challenge against a state channel. A challenge will either prompt another participant into clearing the challenge (via one of the other methods), or cause the channel to finalize at a specific time.
     * @param fixedPart Data describing properties of the state channel that do not change with state updates.
     * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
     * @param variableParts An ordered array of structs, each decribing the properties of the state channel that may change with each state update.
     * @param isFinalCount Describes how many of the submitted states have the `isFinal` property set to `true`. It is implied that the rightmost `isFinalCount` states are final, and the rest are not final.
     * @param sigs An array of signatures that support the state with the `largestTurnNum`.
     * @param whoSignedWhat An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.
     * @param challengerSig The signature of a participant on the keccak256 of the abi.encode of (supportedStateHash, 'forceMove').
     */
    function forceMove(
        FixedPart memory fixedPart,
        uint48 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        Signature memory challengerSig
    ) public virtual;

    /**
     * @notice Repsonds to an ongoing challenge registered against a state channel.
     * @dev Repsonds to an ongoing challenge registered against a state channel.
     * @param challenger The address of the participant whom registered the challenge.
     * @param isFinalAB An pair of booleans describing if the challenge state and/or the response state have the `isFinal` property set to `true`.
     * @param fixedPart Data describing properties of the state channel that do not change with state updates.
     * @param variablePartAB An pair of structs, each decribing the properties of the state channel that may change with each state update (for the challenge state and for the response state).
     * @param sig The responder's signature on the `responseStateHash`.
     */
    function respond(
        address challenger,
        bool[2] memory isFinalAB,
        FixedPart memory fixedPart,
        ForceMoveApp.VariablePart[2] memory variablePartAB,
        // variablePartAB[0] = challengeVariablePart
        // variablePartAB[1] = responseVariablePart
        Signature memory sig
    ) public virtual;

    /**
     * @notice Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.
     * @dev Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.
     * @param fixedPart Data describing properties of the state channel that do not change with state updates.
     * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
     * @param variableParts An ordered array of structs, each decribing the properties of the state channel that may change with each state update.
     * @param isFinalCount Describes how many of the submitted states have the `isFinal` property set to `true`. It is implied that the rightmost `isFinalCount` states are final, and the rest are not final.
     * @param sigs An array of signatures that support the state with the `largestTurnNum`.
     * @param whoSignedWhat An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.
     */
    function checkpoint(
        FixedPart memory fixedPart,
        uint48 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat
    ) public virtual;

    /**
     * @notice Finalizes a channel by providing a finalization proof.
     * @dev Finalizes a channel by providing a finalization proof.
     * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
     * @param fixedPart Data describing properties of the state channel that do not change with state updates.
     * @param appPartHash The keccak256 of the abi.encode of `(challengeDuration, appDefinition, appData)`. Applies to all states in the finalization proof.
     * @param outcomeHash The keccak256 of the abi.encode of the `outcome`. Applies to all stats in the finalization proof.
     * @param numStates The number of states in the finalization proof.
     * @param whoSignedWhat An array denoting which participant has signed which state: `participant[i]` signed the state with index `whoSignedWhat[i]`.
     * @param sigs An array of signatures that support the state with the `largestTurnNum`.
     */
    function conclude(
        uint48 largestTurnNum,
        FixedPart memory fixedPart,
        bytes32 appPartHash,
        bytes32 outcomeHash,
        uint8 numStates,
        uint8[] memory whoSignedWhat,
        Signature[] memory sigs
    ) public virtual;

    // events

    /**
     * @dev Indicates that a challenge has been registered against `channelId`.
     * @param channelId Unique identifier for a state channel.
     * @param turnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.
     * @param finalizesAt The unix timestamp when `channelId` will finalize.
     * @param challenger The address of the participant whom registered the challenge.
     * @param isFinal Boolean denoting whether the challenge state is final.
     * @param fixedPart Data describing properties of the state channel that do not change with state updates.
     * @param variableParts An ordered array of structs, each decribing the properties of the state channel that may change with each state update.
     * @param sigs A list of Signatures that supported the challenge
     * @param whoSignedWhat Indexing information to identify which signature was by which participant
     */
    event ChallengeRegistered(
        bytes32 indexed channelId,
        // everything needed to respond or checkpoint
        uint48 turnNumRecord,
        uint48 finalizesAt,
        address challenger,
        bool isFinal,
        FixedPart fixedPart,
        ForceMoveApp.VariablePart[] variableParts,
        Signature[] sigs,
        uint8[] whoSignedWhat
    );

    /**
     * @dev Indicates that a challenge, previously registered against `channelId`, has been cleared.
     * @param channelId Unique identifier for a state channel.
     * @param newTurnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.
     */
    event ChallengeCleared(bytes32 indexed channelId, uint48 newTurnNumRecord);

    /**
     * @dev Indicates that a challenge has been registered against `channelId`.
     * @param channelId Unique identifier for a state channel.
     */
    event Concluded(bytes32 indexed channelId);
}
