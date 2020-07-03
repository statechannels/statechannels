pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;
import '../NitroAdjudicator.sol';

/**
 * @dev This contract extends the NitroAdjudicator contract to enable it to be more easily unit-tested. It exposes public or external functions that set storage variables or wrap otherwise internal functions. It should not be deployed in a production environment.
 */
contract TESTNitroAdjudicator is NitroAdjudicator {
    // Public wrappers for internal methods:

    /**
     * @dev Wrapper for otherwise internal function. Tests whether a given address is in a given array of addresses.
     * @param suspect A single address of interest.
     * @param addresses A line-up of possible perpetrators.
     * @return true if the address is in the array, false otherwise
     */
    function isAddressInArray(address suspect, address[] memory addresses)
        public
        pure
        returns (bool)
    {
        return _isAddressInArray(suspect, addresses);
    }

    /**
     * @dev Wrapper for otherwise internal function. Given an array of state hashes, checks the validity of the supplied signatures. Valid means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.
     * @param largestTurnNum The largest turn number of the submitted states; will overwrite the stored value of `turnNumRecord`.
     * @param participants A list of addresses representing the participants of a channel.
     * @param stateHashes Array of keccak256(State) submitted in support of a state,
     * @param sigs Array of Signatures, one for each participant
     * @param whoSignedWhat participant[i] signed stateHashes[whoSignedWhat[i]]
     * @return true if the signatures are valid, false otherwise
     */
    function validSignatures(
        uint48 largestTurnNum,
        address[] memory participants,
        bytes32[] memory stateHashes,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat // whoSignedWhat[i] is the index of the state in stateHashes that was signed by participants[i]
    ) public pure returns (bool) {
        return _validSignatures(largestTurnNum, participants, stateHashes, sigs, whoSignedWhat);
    }

    /**
     * @dev Wrapper for otherwise internal function. Given a declaration of which state in the support proof was signed by which participant, check if this declaration is acceptable. Acceptable means there is a signature for each participant, either on the hash of the state for which they are a mover, or on the hash of a state that appears after that state in the array.
     * @param whoSignedWhat participant[i] signed stateHashes[whoSignedWhat[i]]
     * @param largestTurnNum Largest turnNum of the support proof
     * @param nParticipants Number of participants in the channel
     * @param nStates Number of states in the support proof
     * @return true if whoSignedWhat is acceptable, false otherwise
     */
    function acceptableWhoSignedWhat(
        uint8[] memory whoSignedWhat,
        uint48 largestTurnNum,
        uint256 nParticipants,
        uint256 nStates
    ) public pure returns (bool) {
        return _acceptableWhoSignedWhat(whoSignedWhat, largestTurnNum, nParticipants, nStates);
    }

    /**
     * @dev Wrapper for otherwise internal function. Given a digest and digital signature, recover the signer
     * @param _d message digest
     * @param sig ethereum digital signature
     * @return signer
     */
    function recoverSigner(bytes32 _d, Signature memory sig) public pure returns (address) {
        return _recoverSigner(_d, sig);
    }

    /**
     * @dev Manually set the channelStorageHashes for a given channelId.  Shortcuts the public methods (ONLY USE IN A TESTING ENVIRONMENT).
     * @param channelId Unique identifier for a state channel.
     * @param channelData The channelData to be hashed and stored against the channelId
     */
    function setChannelStorage(bytes32 channelId, ChannelData memory channelData) public {
        channelStorageHashes[channelId] = _hashChannelData(channelData);
    }

    /**
     * @dev Manually set the channelStorageHash for a given channelId.  Shortcuts the public methods (ONLY USE IN A TESTING ENVIRONMENT).
     * @param channelId Unique identifier for a state channel.
     * @param h The channelStorageHash to store against the channelId
     */
    function setChannelStorageHash(bytes32 channelId, bytes32 h) public {
        channelStorageHashes[channelId] = h;
    }
}
