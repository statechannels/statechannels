// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import {ExitFormat as Outcome} from '@statechannels/exit-format/contracts/ExitFormat.sol';
import './ForceMove.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IMultiAssetHolder.sol';

/**
@dev An implementation of the IMultiAssetHolder interface. The AssetHolder contract escrows ETH or tokens against state channels. It allows assets to be internally accounted for, and ultimately prepared for transfer from one channel to other channels and/or external destinations, as well as for guarantees to be claimed.
 */
contract MultiAssetHolder is IMultiAssetHolder, StatusManager {
    using SafeMath for uint256;

    // *******
    // Storage
    // *******

    /**
     * holdings[asset][channelId] is the amount of asset held against channel channelId. 0 address implies ETH
     */
    mapping(address => mapping(bytes32 => uint256)) public holdings;

    // **************
    // External methods
    // **************

    /**
     * @notice Deposit ETH or erc20 tokens against a given channelId.
     * @dev Deposit ETH or erc20 tokens against a given channelId.
     * @param asset erc20 token address, or zero address to indicate ETH
     * @param channelId ChannelId to be credited.
     * @param expectedHeld The number of wei/tokens the depositor believes are _already_ escrowed against the channelId.
     * @param amount The intended number of wei/tokens to be deposited.
     */
    function deposit(
        address asset,
        bytes32 channelId,
        uint256 expectedHeld,
        uint256 amount
    ) external override payable {
        require(!_isExternalDestination(channelId), 'Deposit to external destination');
        uint256 amountDeposited;
        // this allows participants to reduce the wait between deposits, while protecting them from losing funds by depositing too early. Specifically it protects against the scenario:
        // 1. Participant A deposits
        // 2. Participant B sees A's deposit, which means it is now safe for them to deposit
        // 3. Participant B submits their deposit
        // 4. The chain re-orgs, leaving B's deposit in the chain but not A's
        uint256 held = holdings[asset][channelId];
        require(held >= expectedHeld, 'holdings < expectedHeld');
        require(held < expectedHeld.add(amount), 'holdings already sufficient');

        // The depositor wishes to increase the holdings against channelId to amount + expectedHeld
        // The depositor need only deposit (at most) amount + (expectedHeld - holdings) (the term in parentheses is non-positive)

        amountDeposited = expectedHeld.add(amount).sub(held); // strictly positive
        // require successful deposit before updating holdings (protect against reentrancy)
        if (asset == address(0)) {
            require(msg.value == amount, 'Incorrect msg.value for deposit');
        } else {
            // require successful deposit before updating holdings (protect against reentrancy)
            require(
                IERC20(asset).transferFrom(msg.sender, address(this), amountDeposited),
                'Could not deposit ERC20s'
            );
        }

        uint256 nowHeld = held.add(amountDeposited);
        holdings[asset][channelId] = nowHeld;
        emit Deposited(channelId, asset, amountDeposited, nowHeld);

        if (asset == address(0)) {
            // refund whatever wasn't deposited.
            uint256 refund = amount.sub(amountDeposited);
            (bool success, ) = msg.sender.call{value: refund}(''); //solhint-disable-line avoid-low-level-calls
            require(success, 'Could not refund excess funds');
        }
    }

    /**
     * @notice Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.
     * @dev Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.
     * @param destination ethereum address to be credited.
     * @param amount Quantity of assets to be transferred.
     */
    function _transferAsset(
        address asset,
        address payable destination,
        uint256 amount
    ) internal {
        if (asset == address(0)) {
            (bool success, ) = destination.call{value: amount}(''); //solhint-disable-line avoid-low-level-calls
            require(success, 'Could not transfer ETH');
        } else {
            IERC20(asset).transfer(destination, amount);
        }
    }

    /**
     * @notice Checks if a given destination is external (and can therefore have assets transferred to it) or not.
     * @dev Checks if a given destination is external (and can therefore have assets transferred to it) or not.
     * @param destination Destination to be checked.
     * @return True if the destination is external, false otherwise.
     */
    function _isExternalDestination(bytes32 destination) internal pure returns (bool) {
        return uint96(bytes12(destination)) == 0;
    }

    /**
     * @notice Converts an ethereum address to a nitro external destination.
     * @dev Converts an ethereum address to a nitro external destination.
     * @param participant The address to be converted.
     * @return The input address left-padded with zeros.
     */
    function _addressToBytes32(address participant) internal pure returns (bytes32) {
        return bytes32(uint256(participant));
    }

    /**
     * @notice Converts a nitro destination to an ethereum address.
     * @dev Converts a nitro destination to an ethereum address.
     * @param destination The destination to be converted.
     * @return The rightmost 160 bits of the input string.
     */
    function _bytes32ToAddress(bytes32 destination) internal pure returns (address payable) {
        return address(uint160(uint256(destination)));
    }

    // **************
    // Requirers
    // **************

    /**
     * @notice Checks that a given variables hash to the data stored on chain.
     * @dev Checks that a given variables hash to the data stored on chain.
     */
    function _requireMatchingFingerprint(
        bytes32 stateHash,
        bytes32 outcomeHash,
        bytes32 channelId
    ) internal view {
        (, , uint160 fingerprint) = _unpackStatus(channelId);
        require(
            fingerprint == _generateFingerprint(stateHash, outcomeHash),
            'incorrect fingerprint'
        );
    }

    /**
     * @notice Checks that a given channel is in the Finalized mode.
     * @dev Checks that a given channel is in the Finalized mode.
     * @param channelId Unique identifier for a channel.
     */
    function _requireChannelFinalized(bytes32 channelId) internal view {
        require(_mode(channelId) == ChannelMode.Finalized, 'Channel not finalized.');
    }

    function _updateFingerprint(
        bytes32 channelId,
        bytes32 stateHash,
        bytes32 outcomeHash
    ) internal {
        (uint48 turnNumRecord, uint48 finalizesAt, ) = _unpackStatus(channelId);

        bytes32 newStatus = _generateStatus(
            ChannelData(turnNumRecord, finalizesAt, stateHash, outcomeHash)
        );
        statusOf[channelId] = newStatus;
    }

    /**
     * @notice Checks that the supplied indices are strictly increasing.
     * @dev Checks that the supplied indices are strictly increasing. This allows us allows us to write a more efficient claim function.
     */
    function _requireIncreasingIndices(uint256[] memory indices) internal pure {
        for (uint256 i = 0; i + 1 < indices.length; i++) {
            require(indices[i] < indices[i + 1], 'Indices must be sorted');
        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? b : a;
    }
}
