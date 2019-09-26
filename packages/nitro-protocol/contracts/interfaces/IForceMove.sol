pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';

/**
  * @dev A ForceMove contract allows state channels to be adjudicated and finalized.
*/
interface IForceMove {
    /**
    * @notice Registers a challenge against a state channel. A challenge will either prompt another participant into clearing the challenge (via one of the other methods), or cause the channel to finalize at a specific time.
    * @dev Registers a challenge against a state channel. A challenge will either prompt another participant into clearing the challenge (via one of the other methods), or cause the channel to finalize at a specific time.
    * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
    * @param supportingData_ Encoded data sufficient to support a state with `largestTurnNum`.
    * @param challengerSig_ The abi.encoded signature of a participant on the keccak256 of the abi.encode of (supportedStateHash, 'forceMove').
    */
    function forceMove(
        uint48 largestTurnNum,
        bytes calldata supportingData_,
        bytes calldata challengerSig_
    ) external;

    /**
    * @notice Repsonds to an ongoing challenge registered against a state channel.
    * @dev Repsonds to an ongoing challenge registered against a state channel.
    * @param challenger The address of the participant whom registered the challenge.
    * @param supportingData_ Encoded data, which when combined with a state stored on chain with turn number t, is sufficient to imply the support of a state with turn number t+1.
    */
    function respond(address challenger, bytes calldata supportingData_) external;

    /**
    * @notice Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.
    * @dev Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.
    * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
    * @param supportingData_ Encoded data sufficient to support a state with `largestTurnNum`.
    */
    function checkpoint(uint48 largestTurnNum, bytes calldata supportingData_) external;

    /**
    * @notice Finalizes a channel by providing a finalization proof.
    * @dev Overwrites the `turnNumRecord` stored against a channel by providing a state with higher turn number, supported by a signature from each participant.
    * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
    * @param supportingData_ Encoded data sufficient to support a state with `largestTurnNum`.
    */
    function conclude(uint48 largestTurnNum, bytes calldata supportingData_) external;

    // events

    /**
    * @dev Indicates that a challenge has been registered against `channelId`.
    * @param channelId Unique identifier for a state channel.
    * @param turnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.
    * @param finalizesAt The unix timestamp when `channelId` will finalize.
    * @param challenger The address of the participant whom registered the challenge.
    * @param isFinal Boolean denoting whether the challenge state is final.
    * @param fixedPartBytes Data describing properties of the state channel that do not change with state updates.
    * @param variablePartsBytes An ordered array of structs, each decribing the properties of the state channel that may change with each state update.
    */
    event ChallengeRegistered(
        bytes32 indexed channelId,
        // everything needed to respond or checkpoint
        uint256 turnNumRecord,
        uint256 finalizesAt,
        address challenger,
        bool isFinal,
        bytes fixedPartBytes,
        bytes variablePartsBytes
    );

    /**
    * @dev Indicates that a challenge, previously registered against `channelId`, has been cleared.
    * @param channelId Unique identifier for a state channel.
    * @param newTurnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.
    */
    event ChallengeCleared(bytes32 indexed channelId, uint256 newTurnNumRecord);

    /**
    * @dev Indicates that a challenge has been registered against `channelId`.
    * @param channelId Unique identifier for a state channel.
    */
    event Concluded(bytes32 indexed channelId);
}
