pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;
import './AssetHolder.sol';

contract TESTAssetHolder is AssetHolder {
    // Public wrappers for internal methods:

    function isExternalAddress(bytes32 destination) public pure returns (bool) {
        return _isExternalAddress(destination);
    }

    function addressToBytes32(address participant) public pure returns (bytes32) {
        return _addressToBytes32(participant);
    }
}
