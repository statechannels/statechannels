pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

library Commitment {
    enum CommitmentType { PreFundSetup, PostFundSetup, App, Conclude }

    struct CommitmentStruct {
        address channelType;
        uint32 channelNonce;
        address[] participants;
        uint8 commitmentType;
        uint32 turnNum;
        uint32 commitmentCount;
        address[] destination;
        uint256[] allocation;
        bytes appAttributes;
    }

    function isPreFundSetup(CommitmentStruct memory self) public pure returns (bool) {
        return self.commitmentType == uint(CommitmentType.PreFundSetup);
    }

    function isPostFundSetup(CommitmentStruct memory self) public pure returns (bool) {
        return self.commitmentType == uint(CommitmentType.PostFundSetup);
    }

    function isApp(CommitmentStruct memory self) public pure returns (bool) {
        return self.commitmentType == uint(CommitmentType.App);
    }

    function isConclude(CommitmentStruct memory self) public pure returns (bool) {
        return self.commitmentType == uint(CommitmentType.Conclude);
    }

    function channelId(CommitmentStruct memory _commitment) public pure returns (address) {
        bytes32 h = keccak256(
            abi.encodePacked(_commitment.channelType, _commitment.channelNonce, _commitment.participants)
        );
        address addr;
        assembly {
            mstore(0, h)
        addr := mload(0)
        } 
        return addr;
    }

    function mover(CommitmentStruct memory _commitment) public pure returns (address) {
        return _commitment.participants[_commitment.turnNum % _commitment.participants.length];
    }

    function requireSignature(CommitmentStruct memory _commitment, uint8 _v, bytes32 _r, bytes32 _s) public pure {
        require(
            mover(_commitment) == recoverSigner(abi.encode(_commitment), _v, _r, _s),
            "mover must have signed Commitment"
        );
    }

    function requireFullySigned(CommitmentStruct memory _commitment, uint8[] memory _v, bytes32[] memory _r, bytes32[] memory _s) public pure {
        for(uint i = 0; i < _commitment.participants.length; i++) {
            require(
                _commitment.participants[i] == recoverSigner(abi.encode(_commitment), _v[i], _r[i], _s[i]),
                "all movers must have signed Commitment"
            );
        }
    }

    function appAttributesEqual(CommitmentStruct memory _commitment, CommitmentStruct memory _otherCommitment) public pure returns (bool) {
        return keccak256(_commitment.appAttributes) == keccak256(_otherCommitment.appAttributes);
    }

    function allocationsEqual(CommitmentStruct memory _commitment, CommitmentStruct memory _otherCommitment) public pure returns (bool) {
        return keccak256(abi.encodePacked(_commitment.allocation)) == keccak256(abi.encodePacked(_otherCommitment.allocation));
    }

    function destinationsEqual(CommitmentStruct memory _commitment, CommitmentStruct memory _otherCommitment) public pure returns (bool) {
        return keccak256(abi.encodePacked(_commitment.destination)) == keccak256(abi.encodePacked(_otherCommitment.destination));
    }

    // utilities
    // =========

    function recoverSigner(bytes memory _d, uint8 _v, bytes32 _r, bytes32 _s) internal pure returns(address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 h = keccak256(_d);

        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, h));

        address a = ecrecover(prefixedHash, _v, _r, _s);

        return(a);
    }
}
