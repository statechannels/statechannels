pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;
import '../AssetHolder.sol';

contract TESTAssetHolder is AssetHolder {
    // Public wrappers for internal methods:

    function setHoldings(bytes32 channelId, uint256 amount) external {
        holdings[channelId] = amount;
    }

    function setAssetOutcomeHashPermissionless(bytes32 channelId, bytes32 outcomeHash)
        external
        returns (bool success)
    {
        _setAssetOutcomeHash(channelId, outcomeHash);
        return true;
    }

    function isExternalAddress(bytes32 destination) public pure returns (bool) {
        return _isExternalAddress(destination);
    }

    function addressToBytes32(address participant) public pure returns (bytes32) {
        return _addressToBytes32(participant);
    }
}
