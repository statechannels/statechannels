pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

contract OptimizedForceMove {
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

    struct VariablePart {
        bytes outcome;
        bytes appData;
    }

    struct State {
        // participants sign the hash of this
        uint256 turnNum;
        bool isFinal;
        bytes32 channelId; // keccack(chainId,participants,channelNonce)
        bytes32 appPartHash; //keccak256(abi.encode(VariablePart))
        bytes32 outcomeHash;
    }

    struct ChannelStorage {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash;
    }

    mapping(bytes32 => bytes32) public channelStorageHashes;

    // Public methods:

    function forceMove(
        uint256 turnNumRecord,
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        Signature memory challengerSig
    ) public {
        (uint256 chainId, address[] memory participants, uint256 channelNonce, address appDefinition, uint256 challengeDuration) = (
            fixedPart.chainId,
            fixedPart.participants,
            fixedPart.channelNonce,
            fixedPart.appDefinition,
            fixedPart.challengeDuration
        );

        // Calculate channelId from fixed part
        bytes32 channelId = keccak256(abi.encodePacked(chainId, participants, channelNonce));

        // ------------
        // REQUIREMENTS
        // ------------

        // Check that the proposed largestTurnNum is larger than the turnNumRecord that is being committed to
        require(largestTurnNum > turnNumRecord, 'Stale challenge!');

        // EITHER there is no information stored against channelId at all (OK)
        if (channelStorageHashes[channelId] != 0) {
            // OR there is, in which case we must check the channel is still open and that the committed turnNumRecord is correct
            bytes32 emptyStorageHash = keccak256(
                abi.encode(ChannelStorage(turnNumRecord, 0, 0, address(0), 0))
            );
            require(emptyStorageHash == channelStorageHashes[channelId], 'Channel closed');
        }

        uint256 m = variableParts.length;
        bool isFinal;
        uint256 turnNum;
        State memory state;
        bytes32[] memory stateHashes;
        for (uint256 i = 0; i < m - 1; i++) {
            isFinal = i > m - isFinalCount;
            turnNum = largestTurnNum + i - m;
            state = State(
                turnNum,
                isFinal,
                channelId,
                keccak256(
                    abi.encodePacked(challengeDuration, appDefinition, variableParts[i].appData)
                ),
                keccak256(abi.encode(variableParts[i].outcome))
            );
            stateHashes[i] = keccak256(abi.encode(state));
            require(
                _validTransition(turnNum, variableParts[i], variableParts[i + 1]),
                'Invalid Transition'
            );
        }

        // check the supplied states are supported by n signatures
        require(
            _validSignatures(largestTurnNum, participants, stateHashes, sigs, whoSignedWhat),
            'Invalid signature'
        );

        // check that the forceMove is signed by a participant and store their address
        bytes32 msgHash = keccak256(
            abi.encode(
                turnNumRecord,
                fixedPart,
                largestTurnNum,
                variableParts,
                isFinalCount,
                sigs,
                whoSignedWhat
            )
        );
        address challenger = _recoverSigner(
            msgHash,
            challengerSig.v,
            challengerSig.r,
            challengerSig.s
        );
        require(_isAddressInArray(challenger, participants), 'Challenger is not a participant');

        // ------------
        // EFFECTS
        // ------------

        ChannelStorage memory channelStorage = ChannelStorage(
            largestTurnNum,
            now + challengeDuration,
            stateHashes[m],
            challenger,
            keccak256(abi.encode(variableParts[m].outcome))
        );

        channelStorageHashes[channelId] = keccak256(abi.encode(channelStorage));
    }
    // Internal methods:

    function _isAddressInArray(address suspect, address[] memory addresses)
        internal
        pure
        returns (bool)
    {
        for (uint256 i = 0; i < addresses.length; i++) {
            if (suspect == addresses[i]) {
                return true;
            }
        }
        return false;
    }

    function _validSignatures(
        uint256 largestTurnNum,
        address[] memory participants,
        bytes32[] memory stateHashes,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat // whoSignedWhat[i] is the index of the state in stateHashes that was signed by participants[i]
    ) internal pure returns (bool) {
        uint256 nParticipants = participants.length;
        uint256 nStates = stateHashes.length;

        require(
            whoSignedWhat.length == nParticipants,
            '_validSignatures: whoSignedWhat must be the same length as participants'
        );

        require(
            _acceptableWhoSignedWhat(whoSignedWhat, largestTurnNum, nParticipants, nStates),
            'Unacceptable whoSignedWhat array'
        );
        for (uint256 i = 0; i < nParticipants; i++) {
            address signer = _recoverSigner(
                stateHashes[whoSignedWhat[i]],
                sigs[i].v,
                sigs[i].r,
                sigs[i].s
            );
            if (signer != participants[i]) {
                return false;
            }
        }
        return true;
    }

    function _acceptableWhoSignedWhat(
        uint8[] memory whoSignedWhat,
        uint256 largestTurnNum,
        uint256 nParticipants,
        uint256 nStates
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < nParticipants; i++) {
            uint256 offset = (nParticipants + largestTurnNum - i) % nParticipants;
            // offset is the difference between the index of the current participant and the index of the participant who owns the largesTurnNum state
            // the extra nParticipants ensures offset always positive
            if (offset < nStates) {
                if (whoSignedWhat[i] < nStates - offset) {
                    return false;
                }
            }
        }
        return true;
    }

    // not yet implemented

    function _recoverSigner(bytes32 _d, uint8 _v, bytes32 _r, bytes32 _s)
        internal
        pure
        returns (address)
    {
        return address(0); // TODO this is a placeholder implementation
    }

    function _validTransition(
        uint256 turnNum,
        VariablePart memory oldVariablePart,
        VariablePart memory newVariablePart
    ) internal pure returns (bool) {
        return true;
    } // TOTO this is a placeholder implementation

}
