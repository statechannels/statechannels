pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';

contract IForceMove {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct FixedPart {
        uint256 chainId;
        address[] participants;
        uint256 channelNonce;
        address appDefinition;
        uint256 challengeDuration;
    }

    struct State {
        // participants sign the hash of this
        uint256 turnNum;
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

    struct ChannelStorage {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash;
    }

    enum ChannelMode {Open, Challenge, Finalized}

    // Public methods:

    function getData(bytes32 channelId)
        public
        view
        returns (uint48 finalizesAt, uint48 turnNumRecord, uint160 fingerprint);

    function forceMove(
        FixedPart memory fixedPart,
        uint48 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        Signature memory challengerSig
    ) public;

    function respond(
        address challenger,
        bool[2] memory isFinalAB,
        FixedPart memory fixedPart,
        ForceMoveApp.VariablePart[2] memory variablePartAB,
        // variablePartAB[0] = challengeVariablePart
        // variablePartAB[1] = responseVariablePart
        Signature memory sig
    ) public;

    function checkpoint(
        FixedPart memory fixedPart,
        uint48 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat
    ) public;

    // events
    event ChallengeRegistered(
        bytes32 indexed channelId,
        // everything needed to respond or checkpoint
        uint256 turnNumRecord,
        uint256 finalizesAt,
        address challenger,
        bool isFinal,
        FixedPart fixedPart,
        ForceMoveApp.VariablePart[] variableParts
    );

    event ChallengeCleared(bytes32 indexed channelId, uint256 newTurnNumRecord);
    event Concluded(bytes32 indexed channelId);
}
