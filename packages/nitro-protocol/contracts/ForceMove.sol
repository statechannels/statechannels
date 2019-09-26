pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './interfaces/IForceMove.sol';
import './interfaces/ForceMoveApp.sol';

contract ForceMove is IForceMove {
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

    struct SupportingData {
        uint8 isFinalCount;
        uint8[] whoSignedWhat;
        FixedPart fixedPart;
        ForceMoveApp.VariablePart[] variableParts;
        Signature[] sigs;
    }

    struct RespondData {
        bool[2] isFinalAB;
        uint8[] whoSignedWhat;
        FixedPart fixedPart;
        ForceMoveApp.VariablePart[2] variablePartAB;
        Signature sig;
    }

    struct ConcludeData {
        FixedPart fixedPart;
        uint8 numStates;
        uint8[] whoSignedWhat;
        Signature[] sigs;
        bytes32 appPartHash;
        bytes32 outcomeHash;
    }

    enum ChannelMode {Open, Challenge, Finalized}
    mapping(bytes32 => bytes32) public channelStorageHashes;

    // Public methods:

    function getData(bytes32 channelId)
        external
        view
        returns (uint48 finalizesAt, uint48 turnNumRecord, uint160 fingerprint)
    {
        (turnNumRecord, finalizesAt, fingerprint) = _getData(channelId);
    }

    function forceMove(
        uint48 largestTurnNum,
        bytes calldata supportingData_,
        bytes calldata challengerSig_
    ) external {
        // decode supportingData_
        SupportingData memory supportingData = abi.decode(supportingData_, (SupportingData));

        bytes32 channelId = _getChannelId(supportingData.fixedPart);

        if (_mode(channelId) == ChannelMode.Open) {
            _requireNonDecreasedTurnNumber(channelId, largestTurnNum);
        } else if (_mode(channelId) == ChannelMode.Challenge) {
            _requireIncreasedTurnNumber(channelId, largestTurnNum);
        } else {
            // This should revert.
            _requireChannelNotFinalized(channelId);
        }
        bytes32 supportedStateHash = _requireStateSupportedBy(
            largestTurnNum,
            channelId,
            supportingData
        );

        address challenger = _requireThatChallengerIsParticipant(
            supportedStateHash,
            supportingData.fixedPart.participants,
            abi.decode(challengerSig_, (Signature))
        );

        // effects
        emit ChallengeRegistered(
            channelId,
            largestTurnNum,
            now + supportingData.fixedPart.challengeDuration,
            challenger,
            supportingData.isFinalCount > 0,
            supportingData.fixedPart,
            supportingData.variableParts
        );

        channelStorageHashes[channelId] = _hashChannelStorage(
            ChannelStorage(
                largestTurnNum,
                now + supportingData.fixedPart.challengeDuration,
                supportedStateHash,
                challenger,
                keccak256(
                    abi.encode(
                        supportingData.variableParts[supportingData.variableParts.length - 1]
                            .outcome
                    )
                )
            )
        );

    }

    function respond(address challenger, bytes calldata respondData_) external {
        // decode respondData_
        RespondData memory respondData = abi.decode(respondData_, (RespondData));

        bytes32 channelId = _getChannelId(respondData.fixedPart);
        (uint48 turnNumRecord, uint48 finalizesAt, ) = _getData(channelId);

        bytes32 challengeOutcomeHash = _hashOutcome(respondData.variablePartAB[0].outcome);
        bytes32 responseOutcomeHash = _hashOutcome(respondData.variablePartAB[1].outcome);
        bytes32 challengeStateHash = _hashState(
            turnNumRecord,
            respondData.isFinalAB[0],
            channelId,
            respondData.fixedPart,
            respondData.variablePartAB[0].appData,
            challengeOutcomeHash
        );

        bytes32 responseStateHash = _hashState(
            turnNumRecord + 1,
            respondData.isFinalAB[1],
            channelId,
            respondData.fixedPart,
            respondData.variablePartAB[1].appData,
            responseOutcomeHash
        );

        // checks

        _requireSpecificChallenge(
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
            _recoverSigner(responseStateHash, respondData.sig) ==
                respondData.fixedPart.participants[(turnNumRecord + 1) %
                    respondData.fixedPart.participants.length],
            'Response not signed by authorized mover'
        );

        _requireValidTransition(
            respondData.fixedPart.participants.length,
            respondData.isFinalAB,
            respondData.variablePartAB,
            turnNumRecord + 1,
            respondData.fixedPart.appDefinition
        );

        // effects
        _clearChallenge(channelId, turnNumRecord + 1);
    }

    function checkpoint(uint48 largestTurnNum, bytes calldata supportingData_) external {
        // decode supportingData_
        SupportingData memory supportingData = abi.decode(supportingData_, (SupportingData));

        bytes32 channelId = _getChannelId(supportingData.fixedPart);

        // checks
        _requireChannelNotFinalized(channelId);
        _requireIncreasedTurnNumber(channelId, largestTurnNum);
        _requireStateSupportedBy(largestTurnNum, channelId, supportingData);

        // effects
        _clearChallenge(channelId, largestTurnNum);

    }

    function conclude(uint48 largestTurnNum, bytes calldata concludeData_) external {
        // decode supportingData_
        ConcludeData memory concludeData = abi.decode(concludeData_, (ConcludeData));

        bytes32 channelId = _getChannelId(concludeData.fixedPart);
        _requireChannelNotFinalized(channelId);

        // By construction, the following states form a valid transition
        bytes32[] memory stateHashes = new bytes32[](concludeData.numStates);
        for (uint256 i = 0; i < concludeData.numStates; i++) {
            stateHashes[i] = keccak256(
                abi.encode(
                    State(
                        largestTurnNum + (i + 1) - concludeData.numStates, // turnNum
                        true, // isFinal
                        channelId,
                        concludeData.appPartHash,
                        concludeData.outcomeHash
                    )
                )
            );
        }

        // checks
        require(
            _validSignatures(
                largestTurnNum,
                concludeData.fixedPart.participants,
                stateHashes,
                concludeData.sigs,
                concludeData.whoSignedWhat
            ),
            'Invalid signatures'
        );

        // effects
        channelStorageHashes[channelId] = _hashChannelStorage(
            ChannelStorage(0, now, bytes32(0), address(0), concludeData.outcomeHash)
        );
        emit Concluded(channelId);
    }

    // Internal methods:

    function _requireThatChallengerIsParticipant(
        bytes32 supportedStateHash,
        address[] memory participants,
        Signature memory challengerSignature
    ) internal pure returns (address challenger) {
        challenger = _recoverSigner(
            keccak256(abi.encode(supportedStateHash, 'forceMove')),
            challengerSignature
        );
        require(_isAddressInArray(challenger, participants), 'Challenger is not a participant');
    }

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
            address signer = _recoverSigner(stateHashes[whoSignedWhat[i]], sigs[i]);
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
    function _recoverSigner(bytes32 _d, Signature memory sig) internal pure returns (address) {
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, _d));
        address a = ecrecover(prefixedHash, sig.v, sig.r, sig.s);
        return (a);
    }

    function _requireStateSupportedBy(
        // returns hash of latest state, if supported
        // else, reverts
        uint256 largestTurnNum,
        bytes32 channelId,
        SupportingData memory supportingData
    ) internal pure returns (bytes32) {
        bytes32[] memory stateHashes = _requireValidTransitionChain(
            largestTurnNum,
            supportingData.variableParts,
            supportingData.isFinalCount,
            channelId,
            supportingData.fixedPart
        );

        require(
            _validSignatures(
                largestTurnNum,
                supportingData.fixedPart.participants,
                stateHashes,
                supportingData.sigs,
                supportingData.whoSignedWhat
            ),
            'Invalid signatures'
        );

        return stateHashes[stateHashes.length - 1];
    }

    function _requireValidTransitionChain(
        // returns stateHashes array if valid
        // else, reverts
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount,
        bytes32 channelId,
        FixedPart memory fixedPart
    ) internal pure returns (bytes32[] memory) {
        bytes32[] memory stateHashes = new bytes32[](variableParts.length);
        uint256 firstFinalTurnNum = largestTurnNum - isFinalCount + 1;
        uint256 turnNum;

        for (uint256 i = 0; i < variableParts.length; i++) {
            turnNum = largestTurnNum - variableParts.length + 1 + i;
            stateHashes[i] = _hashState(
                turnNum,
                turnNum >= firstFinalTurnNum,
                channelId,
                fixedPart,
                variableParts[i].appData,
                _hashOutcome(variableParts[i].outcome)
            );
            if (turnNum < largestTurnNum) {
                _requireValidTransition(
                    fixedPart.participants.length,
                    [turnNum >= firstFinalTurnNum, turnNum + 1 >= firstFinalTurnNum],
                    [variableParts[i], variableParts[i + 1]],
                    turnNum + 1,
                    fixedPart.appDefinition
                );
            }
        }
        return stateHashes;
    }

    function _requireValidTransition(
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
                _bytesEqual(ab[1].outcome, ab[0].outcome),
                'InvalidTransitionError: Cannot move to a final state with a different default outcome'
            );
        } else {
            require(
                !isFinalAB[0],
                'InvalidTransitionError: Cannot move from a final state to a non final state'
            );
            if (turnNumB <= 2 * nParticipants) {
                require(
                    _bytesEqual(ab[1].outcome, ab[0].outcome),
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

    function _bytesEqual(bytes memory left, bytes memory right) internal pure returns (bool) {
        return keccak256(left) == keccak256(right);
    }

    function _clearChallenge(bytes32 channelId, uint256 newTurnNumRecord) internal {
        channelStorageHashes[channelId] = _hashChannelStorage(
            ChannelStorage(newTurnNumRecord, 0, bytes32(0), address(0), bytes32(0))
        );
        emit ChallengeCleared(channelId, newTurnNumRecord);
    }

    function _requireIncreasedTurnNumber(bytes32 channelId, uint48 newTurnNumRecord) internal view {
        (uint48 turnNumRecord, , ) = _getData(channelId);
        require(newTurnNumRecord > turnNumRecord, 'turnNumRecord not increased.');
    }

    function _requireNonDecreasedTurnNumber(bytes32 channelId, uint48 newTurnNumRecord)
        internal
        view
    {
        (uint48 turnNumRecord, , ) = _getData(channelId);
        require(newTurnNumRecord >= turnNumRecord, 'turnNumRecord decreased.');
    }

    function _requireSpecificChallenge(ChannelStorage memory cs, bytes32 channelId) internal view {
        _requireMatchingStorage(cs, channelId);
        _requireOngoingChallenge(channelId);
    }

    function _requireOngoingChallenge(bytes32 channelId) internal view {
        require(_mode(channelId) == ChannelMode.Challenge, 'No ongoing challenge.');
    }

    function _requireChannelNotFinalized(bytes32 channelId) internal view {
        require(_mode(channelId) != ChannelMode.Finalized, 'Channel finalized.');
    }

    function _requireChannelFinalized(bytes32 channelId) internal view {
        require(_mode(channelId) == ChannelMode.Finalized, 'Channel not finalized.');
    }

    function _requireChannelOpen(bytes32 channelId) internal view {
        require(_mode(channelId) == ChannelMode.Open, 'Channel not open.');
    }

    function _requireMatchingStorage(ChannelStorage memory cs, bytes32 channelId) internal view {
        require(
            _matchesHash(cs, channelStorageHashes[channelId]),
            'Channel storage does not match stored version.'
        );
    }

    function _mode(bytes32 channelId) internal view returns (ChannelMode) {
        // Note that _getData(someRandomChannelId) returns (0,0,0), which is
        // correct when nobody has written to storage yet.

        (, uint48 finalizesAt, ) = _getData(channelId);
        if (finalizesAt == 0) {
            return ChannelMode.Open;
        } else if (finalizesAt <= now) {
            return ChannelMode.Finalized;
        } else {
            return ChannelMode.Challenge;
        }
    }

    function _hashChannelStorage(ChannelStorage memory channelStorage)
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

    function _getData(bytes32 channelId)
        internal
        view
        returns (uint48 turnNumRecord, uint48 finalizesAt, uint160 fingerprint)
    {
        bytes32 storageHash = channelStorageHashes[channelId];
        uint16 cursor = 256;
        turnNumRecord = uint48(uint256(storageHash) >> (cursor -= 48));
        finalizesAt = uint48(uint256(storageHash) >> (cursor -= 48));
        fingerprint = uint160(uint256(storageHash));
    }

    function _matchesHash(ChannelStorage memory cs, bytes32 h) internal pure returns (bool) {
        return _hashChannelStorage(cs) == h;
    }

    function _hashState(
        uint256 turnNumRecord,
        bool isFinal,
        bytes32 channelId,
        FixedPart memory fixedPart,
        bytes memory appData,
        bytes32 outcomeHash
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    State(
                        turnNumRecord,
                        isFinal,
                        channelId,
                        keccak256(
                            abi.encode(
                                fixedPart.challengeDuration,
                                fixedPart.appDefinition,
                                appData
                            )
                        ),
                        outcomeHash
                    )
                )
            );
    }

    function _hashOutcome(bytes memory outcome) internal pure returns (bytes32) {
        return keccak256(abi.encode(outcome));
    }

    function _getChannelId(FixedPart memory fixedPart) internal pure returns (bytes32 channelId) {
        channelId = keccak256(
            abi.encode(fixedPart.chainId, fixedPart.participants, fixedPart.channelNonce)
        );
    }

    // events
    event ChallengeRegistered(
        bytes32 indexed channelId,
        // everything needed to respond or checkpoint
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
