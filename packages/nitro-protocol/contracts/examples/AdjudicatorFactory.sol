// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/utils/Create2.sol';

/// @title ChannelFactory
/// @author Connext <support@connext.network>
/// @notice Creates and sets up a new channel proxy contract
contract ChannelFactory {
    // Creation code constants taken from EIP1167
    bytes private constant proxyCreationCodePrefix = hex'3d602d80600a3d3981f3_363d3d373d3d3d363d73';
    bytes private constant proxyCreationCodeSuffix = hex'5af43d82803e903d91602b57fd5bf3';

    bytes32 private creationCodeHash;
    address private immutable mastercopy;
    uint256 private immutable chainId;

    event ChannelCreation(address channel);

    /// @dev Creates a new `ChannelFactory`
    /// @param _mastercopy the address of the `ChannelMastercopy` (channel logic)
    /// @param _chainId the chain identifier when generating the CREATE2 salt. If zero, the chain identifier used in the proxy salt will be the result of the opcode
    constructor(address _mastercopy, uint256 _chainId) {
        mastercopy = _mastercopy;
        chainId = _chainId;
        creationCodeHash = keccak256(_getProxyCreationCode(_mastercopy));
    }

    ////////////////////////////////////////
    // Public Methods

    /// @dev Allows us to get the mastercopy that this factory will deploy channels against
    function getMastercopy() external view returns (address) {
        return mastercopy;
    }

    /// @dev Allows us to get the chainId that this factory will use in the create2 salt
    function getChainId() public view returns (uint256 _chainId) {
        // Hold in memory to reduce sload calls
        uint256 chain = chainId;
        if (chain == 0) {
            assembly {
                _chainId := chainid()
            }
        } else {
            _chainId = chain;
        }
    }

    /// @dev Allows us to get the chainId that this factory has stored
    function getStoredChainId() external view returns (uint256) {
        return chainId;
    }

    /// @dev Returns the proxy code used to both calculate the CREATE2 address and deploy the channel proxy pointed to the `ChannelMastercopy`
    function getProxyCreationCode() public view returns (bytes memory) {
        return _getProxyCreationCode(mastercopy);
    }

    /// @dev Allows us to get the address for a new channel contract created via `createChannel`
    function getChannelAddress(bytes32 channelId) external view returns (address) {
        return Create2.computeAddress(channelId, creationCodeHash);
    }

    /// @dev Allows us to create new channel contract and get it all set up in one transaction
    function createChannel(bytes32 channelId) public returns (address channel) {
        channel = _deployChannelProxy(channelId);
        emit ChannelCreation(channel);
    }

    ////////////////////////////////////////
    // Internal Methods

    function _getProxyCreationCode(address _mastercopy) internal pure returns (bytes memory) {
        return abi.encodePacked(proxyCreationCodePrefix, _mastercopy, proxyCreationCodeSuffix);
    }

    /// @dev Allows us to create new channel contact using CREATE2
    function _deployChannelProxy(bytes32 channelId) internal returns (address) {
        bytes32 salt = channelId;
        return Create2.deploy(0, salt, getProxyCreationCode());
    }
}
