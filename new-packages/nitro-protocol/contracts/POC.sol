pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

contract POC {
    struct ChannelStorage {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash;
        address challengerAddress;
        bytes32 outcomeHash;
    }

    function getHashedStorage(ChannelStorage memory channelStorage)
        public
        pure
        returns (bytes32 newHash)
    {
        // The hash is constructed from left to right.
        uint256 result;

        // Shift finalizesAt 256 - 48 = 208 bits left to fill the first 48 bits
        result = uint256(channelStorage.finalizesAt) << 208;

        // logical or with turnNumRecord padded with 160 zeros to get the next 48 bits
        result = result | (channelStorage.turnNumRecord << 160);

        // logical or with the last 160 bits of the hash of the encoded storage
        result = result | uint256(uint160(uint256(keccak256(abi.encode(channelStorage)))));

        newHash = bytes32(result);
    }

    function getData(uint256 storageHash)
        public
        pure
        returns (uint160 fingerprint, uint48 turnNumRecord, uint48 finalizesAt)
    {
        fingerprint = uint160(storageHash);
        turnNumRecord = uint48(storageHash >> 160);
        finalizesAt = uint48(storageHash >> (160 + 48));
    }

    function matchesHash(ChannelStorage memory cs, bytes32 h) public pure returns (bool) {
        return getHashedStorage(cs) == h;
    }
}
