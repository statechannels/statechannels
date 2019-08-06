pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

contract optimizedForceMove {

    struct FixedPart {
    string chainId;
    address[] participants;
    uint256 channelNonce;
    address appDefinition;
    }

    struct VariablePart {
    bytes32 outcomeHash;
    bytes32 apppData;
    }

    struct State { // participants sign this
    uint256 turnNum;
    bool isFinal;
    address appDefinition;
    bytes32 channelId;  // keccack(chainId,participants,channelNonce)
    bytes32 variablePartHash; //keccak(VariablePart)
    }

    struct ChannelStorage {
    uint256 turnNumRecord;
    uint256 finalizesAt;
    bytes32 stateHash; // keccak(State)
    address challengerAddress;
    bytes32 outcomeHash;
    }

    mapping(address => bytes32) public channelStorageHashes;


    // Public methods:


    function forceMove(uint turnNumRecord, FixedPart fixedPart, VariableParts[] variableParts, uint newTurnNumRecord, bool[] isFinals, Signature[] sigs, Signature challengerSig) public returns() {

    (
    string chainId,
    address[] participants,
    uint256 channelNonce,
    address appDefinition,
    ) = fixedPart;

    address channelID = keccak(chainId,participants,channelNonce);

    // ------------
    // REQUIREMENTS
    // ------------

    require(keccack(ChannelStorage(turnNumRecord, 0, 0, 0)) == channelStorageHashes[channelId],'Channel not open')
    if (variableParts.length > 1) {
        require(_validNChain(fixedPart, variableParts, newTurnNumRecord, isFinals, sigs, participants),'Not a valid chain of n commitments');
        } else {
        require(_validUnanimousConsensus(fixedPart,variableParts[0], newTurnNumRecord, isFinals[0], sigs, participants), 'Not a valid unaninmous consensus');
        }

    require(newTurnNumRecord > turnNumRecord, 'Stale challenge!')

    (bytes32 msgHash, uint8 v, bytes32 r, bytes32 s) = challengerSig;
    address challenger = ecrecover(msgHash, v, r, s);
    require(_isAParticipant(challenger, participants),'Challenger is not a participant');

    // ------------
    // EFFECTS
    // ------------

    State memory state = State(
        newTurnNumRecord,
        isFinals[end],
        channelID,
        keccak(variableParts[end])
        );

    ChannelStorage memory channelStorage = ChannelStorage(
        newTurnNumRecord;
        now + challengeInterval,
        keccak(state),
        challenger,
    );

    channelStorageHashes[channelId] = keccak(channelStorage);
    };
    ```

    // Internal methods:

    function _isAParticipant(address suspect, address[] addresses) internal returns bool {
    for (i = 0; i < adresses.length; i++) {
        if (suspect == addresses[i]) {
        return true;
        }
    }
    return false;
    }

    function _validNChain(address channelID, FixedPart fixedPart, VariablePart[] variableParts, uint256 newTurnNumRecord, bool[] isFinals, Signature[] sigs, address[] participants) internal returns bool {
    uint8 v;
    bytes32 r;
    bytes32 s;
    uint n = participants.length;
    for(i = 0; i < n; i++) {
        uint256 turnNum = newTurnNumRecord - n + i;
        State memory state = State(turnNum, isFinals[i], fixedPart.appDefinition, channelId, variableParts[i]);
        (v , r , s) = sigs[i];
        if(_recoverSigner(abi.encode(state), v, r, s)) != participants[turnNum] % n) {return false;} // _recoverSigner is an fmg-core method
        if(turnNum < n){
        if(!_validTransition(fixedPart, variableParts[i], isFinals[i], turnNum, variableParts[i+1], isFinals[i+1], turnNum + 1)) {return false;}
        }
    }
    return true;
    }

    function _validUnanimousConsensus(FixedPart fixedpart, VariablePart variablePart, uint256 newTurnNumRecord, bool isFinal, Signature[] sigs, address[] participants) internal returns bool {

    uint8 v;
    bytes32 r;
    bytes32 s;
    uint n = participants.length;

    for(i = 0; i < n; i++) {
        uint256 turnNum = newTurnNumRecord - n + i;
        (v , r , s) = sigs[i];
        State memory state = State(turnNum, isFinal, fixedPart.appDefinition, channelId, variablePart);
        if(_recoverSigner(abi.encode(state), v, r, s)) != participants[turnNum] % n) {return false;} // _recoverSigner is an fmg-core method
        }
    }
}