pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';

contract ForceMove {
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

    struct ChannelStorageLite {
        uint256 finalizesAt;
        bytes32 stateHash;
        address challengerAddress;
        bytes32 outcomeHash;
    }

    mapping(bytes32 => bytes32) public channelStorageHashes;

    // Public methods:

    function getData(bytes32 channelId)
        public
        view
        returns (uint48 finalizesAt, uint48 turnNumRecord, uint160 fingerprint)
    {
        (turnNumRecord, finalizesAt, fingerprint) = _getData(channelStorageHashes[channelId]);
    }

    function forceMove(
        uint48 turnNumRecord,
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        Signature memory challengerSig
    ) public {
        // Calculate channelId from fixed part
        bytes32 channelId = keccak256(
            abi.encode(fixedPart.chainId, fixedPart.participants, fixedPart.channelNonce)
        );
        // ------------
        // REQUIREMENTS
        // ------------

        // Check that the proposed largestTurnNum is larger than or equal to the turnNumRecord that is being committed to
        require(largestTurnNum >= turnNumRecord, 'Stale challenge!');

        _requireChannelOpen(turnNumRecord, channelId);

        bytes32 supportedStateHash = _stateSupportedBy(
            largestTurnNum,
            variableParts,
            isFinalCount,
            channelId,
            fixedPart,
            sigs,
            whoSignedWhat
        );

        // check that the forceMove is signed by a participant and store their address

        address challenger = _recoverSigner( // TODO: what if someone nabs this signature off of a transaction and uses it in a front-ran tx?
            keccak256(
                abi.encode(
                    largestTurnNum,
                    channelId,
                    'forceMove' // Express statement of intent to forceMove this channel to this turnNum
                )
            ),
            challengerSig.v,
            challengerSig.r,
            challengerSig.s
        );
        require(
            _isAddressInArray(challenger, fixedPart.participants),
            'Challenger is not a participant'
        );

        // ------------
        // EFFECTS
        // ------------

        emit ChallengeRegistered(
            channelId,
            largestTurnNum,
            now + fixedPart.challengeDuration,
            challenger,
            isFinalCount > 0,
            fixedPart,
            variableParts
        );

        channelStorageHashes[channelId] = _getHash(
            ChannelStorage(
                largestTurnNum,
                now + fixedPart.challengeDuration,
                supportedStateHash,
                challenger,
                keccak256(abi.encode(variableParts[variableParts.length - 1].outcome))
            )
        );

    }

    function respond(
        uint256 turnNumRecord,
        uint256 finalizesAt,
        address challenger,
        bool[2] memory isFinalAB,
        FixedPart memory fixedPart,
        ForceMoveApp.VariablePart[2] memory variablePartAB,
        // variablePartAB[0] = challengeVariablePart
        // variablePartAB[1] = responseVariablePart
        Signature memory sig
    ) public {
        // Calculate channelId from fixed part
        bytes32 channelId = keccak256(
            abi.encode(fixedPart.chainId, fixedPart.participants, fixedPart.channelNonce)
        );

        bytes32 challengeOutcomeHash = keccak256(abi.encode(variablePartAB[0].outcome));
        bytes32 responseOutcomeHash = keccak256(abi.encode(variablePartAB[1].outcome));
        bytes32 challengeStateHash = keccak256(
            abi.encode(
                State(
                    turnNumRecord,
                    isFinalAB[0],
                    channelId,
                    keccak256(
                        abi.encode(
                            fixedPart.challengeDuration,
                            fixedPart.appDefinition,
                            variablePartAB[0].appData
                        )
                    ),
                    challengeOutcomeHash
                )
            )
        );
        bytes32 responseStateHash = keccak256(
            abi.encode(
                State(
                    turnNumRecord + 1,
                    isFinalAB[1],
                    channelId,
                    keccak256(
                        abi.encode(
                            fixedPart.challengeDuration,
                            fixedPart.appDefinition,
                            variablePartAB[1].appData
                        )
                    ),
                    responseOutcomeHash
                )
            )
        );

        // requirements

        _requireOngoingChallenge(
            ChannelStorage(
                turnNumRecord,
                finalizesAt,
                challengeStateHash,
                challenger,
                challengeOutcomeHash
            ),
            channelId
        );

        require(
            _recoverSigner(responseStateHash, sig.v, sig.r, sig.s) ==
                fixedPart.participants[(turnNumRecord + 1) % fixedPart.participants.length],
            'Response not signed by authorized mover'
        );

        require(
            _validTransition(
                fixedPart.participants.length,
                isFinalAB,
                variablePartAB,
                turnNumRecord + 1,
                fixedPart.appDefinition
            ) // reason string is not required (_validTransition never returns false, only reverts with its own reason)
        );

        // effects
        _clearChallenge(channelId, turnNumRecord + 1);
    }

    function refute(
        uint256 turnNumRecord,
        uint256 refutationStateTurnNum,
        uint256 finalizesAt,
        address challenger,
        bool[2] memory isFinalAB,
        FixedPart memory fixedPart,
        ForceMoveApp.VariablePart[2] memory variablePartAB,
        // variablePartAB[0] = challengeVariablePart
        // variablePartAB[1] = refutationVariablePart
        Signature memory refutationStateSig
    ) public {
        // requirements

        require(
            refutationStateTurnNum > turnNumRecord,
            'Refutation state must have a higher turn number'
        );
        // Calculate channelId from fixed part
        bytes32 channelId = keccak256(
            abi.encode(fixedPart.chainId, fixedPart.participants, fixedPart.channelNonce)
        );

        bytes32 challengeOutcomeHash = keccak256(abi.encode(variablePartAB[0].outcome));
        bytes32 refutationOutcomeHash = keccak256(abi.encode(variablePartAB[1].outcome));
        bytes32 challengeStateHash = keccak256(
            abi.encode(
                State(
                    turnNumRecord,
                    isFinalAB[0],
                    channelId,
                    keccak256(
                        abi.encode(
                            fixedPart.challengeDuration,
                            fixedPart.appDefinition,
                            variablePartAB[0].appData
                        )
                    ),
                    challengeOutcomeHash
                )
            )
        );
        bytes32 refutationStateHash = keccak256(
            abi.encode(
                State(
                    refutationStateTurnNum,
                    isFinalAB[1],
                    channelId,
                    keccak256(
                        abi.encode(
                            fixedPart.challengeDuration,
                            fixedPart.appDefinition,
                            variablePartAB[1].appData
                        )
                    ),
                    refutationOutcomeHash
                )
            )
        );

        // requirements

        _requireOngoingChallenge(
            ChannelStorage(
                turnNumRecord,
                finalizesAt,
                challengeStateHash,
                challenger, // this is a check that the asserted challenger is in fact the challenger
                challengeOutcomeHash
            ),
            channelId
        );

        require(
            _recoverSigner(
                    refutationStateHash,
                    refutationStateSig.v,
                    refutationStateSig.r,
                    refutationStateSig.s
                ) ==
                challenger,
            'Refutation state not signed by challenger'
        );

        // effects
        _clearChallenge(channelId, turnNumRecord);
    }

    function checkpoint(
        FixedPart memory fixedPart,
        uint48 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        ChannelStorage memory channelStorage
    ) public {
        // Calculate channelId from fixed part
        bytes32 channelId = keccak256(
            abi.encode(fixedPart.chainId, fixedPart.participants, fixedPart.channelNonce)
        );

        // ------------
        // REQUIREMENTS
        // ------------

        _requireChannelNotFinalized(channelStorage, channelId);
        _requireIncreasedTurnNumber(channelStorage, channelId, largestTurnNum);

        _stateSupportedBy(
            largestTurnNum,
            variableParts,
            isFinalCount,
            channelId,
            fixedPart,
            sigs,
            whoSignedWhat
        ); // reverts if no state supported by input data

        // effects
        _clearChallenge(channelId, largestTurnNum);

    }

    function concludeFromOpen(
        uint48 turnNumRecord,
        uint256 largestTurnNum,
        FixedPart memory fixedPart, // don't need appDefinition
        bytes32 appPartHash,
        bytes32 outcomeHash,
        uint8 numStates,
        uint8[] memory whoSignedWhat,
        Signature[] memory sigs
    ) public {
        // Calculate channelId from fixed part
        bytes32 channelId = keccak256(
            abi.encode(fixedPart.chainId, fixedPart.participants, fixedPart.channelNonce)
        );

        _requireChannelOpen(turnNumRecord, channelId);

        _conclude(
            largestTurnNum,
            numStates,
            fixedPart.participants,
            channelId,
            appPartHash,
            outcomeHash,
            sigs,
            whoSignedWhat
        );
    }

    function concludeFromChallenge(
        uint48 largestTurnNum,
        FixedPart memory fixedPart, // don't need appDefinition
        bytes32 appPartHash,
        uint8 numStates,
        uint8[] memory whoSignedWhat,
        Signature[] memory sigs,
        bytes32 newOutcomeHash,
        ChannelStorage memory channelStorage
    ) public {
        // Calculate channelId from fixed part
        bytes32 channelId = keccak256(
            abi.encode(fixedPart.chainId, fixedPart.participants, fixedPart.channelNonce)
        );

        _requireOngoingChallenge(channelStorage, channelId);

        _conclude(
            largestTurnNum,
            numStates,
            fixedPart.participants,
            channelId,
            appPartHash,
            newOutcomeHash,
            sigs,
            whoSignedWhat
        );
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
        require(
            whoSignedWhat.length == nParticipants,
            '_validSignatures: whoSignedWhat must be the same length as participants'
        );
        for (uint256 i = 0; i < nParticipants; i++) {
            uint256 offset = (nParticipants + largestTurnNum - i) % nParticipants;
            // offset is the difference between the index of participant[i] and the index of the participant who owns the largesTurnNum state
            // the additional nParticipants in the dividend ensures offset always positive
            if (whoSignedWhat[i] + offset < nStates - 1) {
                return false;
            }
        }
        return true;
    }

    bytes constant prefix = '\x19Ethereum Signed Message:\n32';
    function _recoverSigner(bytes32 _d, uint8 _v, bytes32 _r, bytes32 _s)
        internal
        pure
        returns (address)
    {
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, _d));
        address a = ecrecover(prefixedHash, _v, _r, _s);
        return (a);
    }

    function _stateSupportedBy(
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount,
        bytes32 channelId,
        FixedPart memory fixedPart,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat // whoSignedWhat[i] is the index of the state in stateHashes that was signed by participants[i]
    ) internal pure returns (bytes32) {
        bytes32[] memory stateHashes = _validTransitionChain(
            largestTurnNum,
            variableParts,
            isFinalCount,
            channelId,
            fixedPart
        ); // if this function returns the array (and doesn't revert), this implies a validTransition chain

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

        return stateHashes[stateHashes.length - 1];
    }

    function _validTransitionChain(
        // returns stateHashes array (implies true) else reverts
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount,
        bytes32 channelId,
        FixedPart memory fixedPart
    ) internal pure returns (bytes32[] memory) {
        bytes32[] memory stateHashes = new bytes32[](variableParts.length);
        for (uint256 i = 0; i < variableParts.length; i++) {
            stateHashes[i] = keccak256(
                abi.encode(
                    State(
                        largestTurnNum + i - variableParts.length + 1, // turnNum
                        i > variableParts.length - isFinalCount, // isFinal
                        channelId,
                        keccak256(
                            abi.encode(
                                fixedPart.challengeDuration,
                                fixedPart.appDefinition,
                                variableParts[i].appData
                            )
                        ),
                        keccak256(abi.encode(variableParts[i].outcome))
                    )
                )
            );
            if (i + 1 != variableParts.length) {
                // no transition from final state
                require(
                    _validTransition(
                        fixedPart.participants.length, // nParticipants
                        [
                            i > variableParts.length - isFinalCount,
                            i + 1 > variableParts.length - isFinalCount
                        ], // [a.isFinal, b.isFinal]
                        [variableParts[i], variableParts[i + 1]], // [a,b]
                        largestTurnNum + i - variableParts.length + 2, // b.turnNum
                        fixedPart.appDefinition
                    )
                ); // reason string not necessary (called function will provide reason for reverting)
            }
        }
        return stateHashes;
    }

    function _validTransition(
        uint256 nParticipants,
        bool[2] memory isFinalAB, // [a.isFinal, b.isFinal]
        ForceMoveApp.VariablePart[2] memory ab, // [a,b]
        uint256 turnNumB,
        address appDefinition
    ) internal pure returns (bool) {
        // a prior check on the signatures for the submitted states implies that the following fields are equal for a and b:
        // chainId, participants, channelNonce, appDefinition, challengeDuration
        // and that the b.turnNum = a.turnNum + 1
        if (isFinalAB[1]) {
            require(
                keccak256(ab[1].outcome) == keccak256(ab[0].outcome),
                'InvalidTransitionError: Cannot move to a final state with a different default outcome'
            );
        } else {
            require(
                !isFinalAB[0],
                'InvalidTransitionError: Cannot move from a final state to a non final state'
            );
            if (turnNumB <= 2 * nParticipants) {
                require(
                    keccak256(ab[1].outcome) == keccak256(ab[0].outcome),
                    'InvalidTransitionError: Cannot change the default outcome during setup phase'
                );
                require(
                    keccak256(ab[1].appData) == keccak256(ab[0].appData),
                    'InvalidTransitionError: Cannot change the appData during setup phase'
                );
            } else {
                require(
                    ForceMoveApp(appDefinition).validTransition(
                        ab[0],
                        ab[1],
                        turnNumB,
                        nParticipants
                    )
                );
                // reason string not necessary (called function will provide reason for reverting)
            }
        }
        return true;
    }

    function _clearChallenge(bytes32 channelId, uint256 newTurnNumRecord) internal {
        channelStorageHashes[channelId] = _getHash(
            ChannelStorage(newTurnNumRecord, 0, bytes32(0), address(0), bytes32(0))
        );
        emit ChallengeCleared(channelId, newTurnNumRecord);
    }

    function _conclude(
        uint256 largestTurnNum,
        uint8 numStates,
        address[] memory participants,
        bytes32 channelId,
        bytes32 appPartHash,
        bytes32 outcomeHash,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat
    ) internal {
        bytes32[] memory stateHashes = new bytes32[](numStates);
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

        // check the supplied states are supported by n signatures
        require(
            _validSignatures(largestTurnNum, participants, stateHashes, sigs, whoSignedWhat),
            'Invalid signatures'
        );

        // effects

        // set channel storage
        channelStorageHashes[channelId] = _getHash(
            ChannelStorage(0, now, bytes32(0), address(0), outcomeHash)
        );

        // emit event
        emit Concluded(channelId);
    }

    function _requireChannelOpen(uint48 turnNumRecord, bytes32 channelId) internal view {
        // EITHER there is no information stored against channelId at all (OK)
        // OR there is, in which case we must check the channel is still open
        // and that the committed turnNumRecord is correct
        require(
            channelStorageHashes[channelId] == bytes32(0) ||
                channelStorageHashes[channelId] ==
                _getHash(ChannelStorage(turnNumRecord, 0, 0, address(0), 0)),
            'Channel not open.'
        );
    }

    function _requireMatchingStorage(ChannelStorage memory cs, bytes32 channelId) internal view {
        require(
            _matchesHash(cs, channelStorageHashes[channelId]),
            'Channel storage does not match stored version.'
        );
    }

    function _requireIncreasedTurnNumber(
        ChannelStorage memory cs,
        bytes32 channelId,
        uint48 newTurnNumRecord
    ) internal view {
        _requireMatchingStorage(cs, channelId);
        require(newTurnNumRecord > cs.turnNumRecord, 'turnNumRecord not increased.');
    }

    function _requireChallengePresent(ChannelStorage memory cs, bytes32 channelId) internal view {
        _requireMatchingStorage(cs, channelId);
        require(cs.finalizesAt > 0, 'Challenge not present.');
    }

    function _requireOngoingChallenge(ChannelStorage memory cs, bytes32 channelId) internal view {
        _requireMatchingStorage(cs, channelId);
        require(cs.finalizesAt > now, 'Challenge expired or not present.');

    }

    function _requireChannelNotFinalized(ChannelStorage memory cs, bytes32 channelId)
        internal
        view
    {
        require(cs.finalizesAt == 0 || cs.finalizesAt > now, 'Challenge expired');
        _requireMatchingStorage(cs, channelId);
    }

    function _getHash(ChannelStorage memory channelStorage)
        internal
        pure
        returns (bytes32 newHash)
    {
        // The hash is constructed from left to right.
        uint256 result;
        uint16 cursor = 256;

        // Shift turnNumRecord 208 bits left to fill the first 48 bits
        result = uint256(channelStorage.turnNumRecord) << (cursor -= 48);

        // logical or with finalizesAt padded with 160 zeros to get the next 48 bits
        result |= (channelStorage.finalizesAt << (cursor -= 48));

        // logical or with the last 160 bits of the hash of the encoded storage
        result |= uint256(uint160(uint256(keccak256(abi.encode(channelStorage)))));

        newHash = bytes32(result);
    }

    function _getData(bytes32 storageHash)
        public
        pure
        returns (uint48 turnNumRecord, uint48 finalizesAt, uint160 fingerprint)
    {
        uint16 cursor = 256;
        turnNumRecord = uint48(uint256(storageHash) >> (cursor -= 48));
        finalizesAt = uint48(uint256(storageHash) >> (cursor -= 48));
        fingerprint = uint160(uint256(storageHash));
    }

    function _matchesHash(ChannelStorage memory cs, bytes32 h) internal pure returns (bool) {
        return _getHash(cs) == h;
    }

    // events
    event ChallengeRegistered(
        bytes32 indexed channelId,
        // everything needed to respond or refute
        uint256 turnNunmRecord,
        uint256 finalizesAt,
        address challenger,
        bool isFinal,
        FixedPart fixedPart,
        ForceMoveApp.VariablePart[] variableParts
    );

    event ChallengeCleared(bytes32 indexed channelId, uint256 newTurnNumRecord);
    event Concluded(bytes32 indexed channelId);
}
