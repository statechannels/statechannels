pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

contract OptimizedForceMove {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct FixedPart {
        string chainId;
        address[] participants;
        uint256 channelNonce;
        address appDefinition;
    }

    struct VariablePart {
        bytes32 outcomeHash;
        bytes32 appData;
    }

    struct State {
        // participants sign this
        uint256 turnNum;
        bool isFinal;
        address appDefinition;
        bytes32 channelId; // keccack(chainId,participants,channelNonce)
        bytes32 variablePartHash; //keccak256(abi.encode(VariablePart))
    }

    struct ChannelStorage {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash;
    }

    mapping(bytes32 => bytes32) public channelStorageHashes;

    uint256 challengeInterval = 1 minutes;

    // Public methods:

    function forceMove(
        uint256 turnNumRecord,
        FixedPart memory fixedPart,
        VariablePart[] memory variableParts,
        uint256 newTurnNumRecord,
        bool[] memory isFinals,
        Signature[] memory sigs,
        Signature memory challengerSig
    ) public {
        (string memory chainId, address[] memory participants, uint256 channelNonce, address appDefinition) = (
            fixedPart.chainId,
            fixedPart.participants,
            fixedPart.channelNonce,
            fixedPart.appDefinition
        );

        bytes32 channelId = keccak256(abi.encodePacked(chainId, participants, channelNonce));

        // ------------
        // REQUIREMENTS
        // ------------

        require(
            keccak256(abi.encode(ChannelStorage(turnNumRecord, 0, 0, address(0), 0))) ==
                channelStorageHashes[channelId],
            'Channel not open'
        );

        if (variableParts.length > 1) {
            require(
                _validNChain(
                    channelId,
                    fixedPart,
                    variableParts,
                    newTurnNumRecord,
                    isFinals,
                    sigs,
                    participants
                ),
                'Not a valid chain of n commitments'
            );
        } else {
            require(
                _validUnanimousConsensus(
                    channelId,
                    fixedPart,
                    variableParts[0],
                    newTurnNumRecord,
                    isFinals[0],
                    sigs,
                    participants
                ),
                'Not a valid unaninmous consensus'
            );
        }

        require(newTurnNumRecord > turnNumRecord, 'Stale challenge!');

        (bytes32 msgHash, uint8 v, bytes32 r, bytes32 s) = (
            challengerSig.msgHash,
            challengerSig.v,
            challengerSig.r,
            challengerSig.s
        );
        address challenger = ecrecover(msgHash, v, r, s);
        require(_isAParticipant(challenger, participants), 'Challenger is not a participant');

        // ------------
        // EFFECTS
        // ------------

        State memory state = State(
            newTurnNumRecord,
            isFinals[isFinals.length],
            appDefinition,
            channelId,
            keccak256(abi.encode(variableParts[variableParts.length]))
        );

        ChannelStorage memory channelStorage = ChannelStorage(
            newTurnNumRecord,
            now + challengeInterval,
            keccak256(abi.encode(state)),
            challenger,
            variableParts[variableParts.length].outcomeHash
        );

        channelStorageHashes[channelId] = keccak256(abi.encode(channelStorage));
    }
    // Internal methods:

    function _isAParticipant(address suspect, address[] memory addresses)
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

    function _validNChain(
        bytes32 channelId,
        FixedPart memory fixedPart,
        VariablePart[] memory variableParts,
        uint256 newTurnNumRecord,
        bool[] memory isFinals,
        Signature[] memory sigs,
        address[] memory participants
    ) internal pure returns (bool) {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 n = participants.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 turnNum = newTurnNumRecord - n + i;
            State memory state = State(
                turnNum,
                isFinals[i],
                fixedPart.appDefinition,
                channelId,
                keccak256(abi.encode(variableParts[i]))
            );
            (v, r, s) = (sigs[i].v, sigs[i].r, sigs[i].s);
            if (_recoverSigner(abi.encode(state), v, r, s) != participants[turnNum % n]) {
                return false;
            } // _recoverSigner is an fmg-core method
            if (turnNum < n) {
                if (
                    !_validTransition(
                        fixedPart,
                        variableParts[i],
                        isFinals[i],
                        turnNum,
                        variableParts[i + 1],
                        isFinals[i + 1],
                        turnNum + 1
                    )
                ) {
                    return false;
                }
            }
        }
        return true;
    }

    function _validUnanimousConsensus(
        bytes32 channelId,
        FixedPart memory fixedPart,
        VariablePart memory variablePart,
        uint256 newTurnNumRecord,
        bool isFinal,
        Signature[] memory sigs,
        address[] memory participants
    ) internal pure returns (bool) {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 n = participants.length;

        for (uint256 i = 0; i < n; i++) {
            uint256 turnNum = newTurnNumRecord - n + i;
            (v, r, s) = (sigs[i].v, sigs[i].r, sigs[i].s);
            State memory state = State(
                turnNum,
                isFinal,
                fixedPart.appDefinition,
                channelId,
                keccak256(abi.encode((variablePart)))
            );
            if (_recoverSigner(abi.encode(state), v, r, s) != participants[turnNum % n]) {
                return false;
            } // _recoverSigner is an fmg-core method
        }
    }

    // not yet implemented

    function _recoverSigner(bytes memory _d, uint8 _v, bytes32 _r, bytes32 _s)
        internal
        pure
        returns (address); // abstraction

    function _validTransition(
        FixedPart memory fixedPart,
        VariablePart memory oldVariablePart,
        bool oldIsFinal,
        uint256 oldTurnNum,
        VariablePart memory newVariablePart,
        bool newIsFinal,
        uint256 newTurnNum
    ) internal pure returns (bool); // abstraction
}
