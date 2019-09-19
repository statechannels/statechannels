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

    function getHash(ChannelStorage memory channelStorage) public pure returns (uint256 newHash) {
        newHash = uint256(keccak256(abi.encode(channelStorage))) >> 160;
        newHash |= channelStorage.turnNumRecord << 160;
        newHash |= channelStorage.finalizesAt << 208;
        return newHash;
    }

    function getData(uint256 storageHash)
        public
        pure
        returns (uint160 fingerprint, uint48 turnNumRecord, uint48 finalizesAt)
    {
        fingerprint = uint160(storageHash);
        turnNumRecord = uint48(storageHash >> 160);
        finalizesAt = uint48(storageHash >> 208);
    }

    function matchesHash(ChannelStorage memory cs, uint256 h) public pure returns (bool) {
        return getHash(cs) == h;
    }
}
