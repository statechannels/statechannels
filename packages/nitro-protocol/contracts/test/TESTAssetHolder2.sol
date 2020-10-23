pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import './TESTAssetHolder.sol';

/**
 * @dev This contract is a clone of the TESTAssetHolder contract. It is used for testing purposes only, to enable testing of transferAll and claimAll in multiple AssetHolders. It has a dummy storage variable in order to change the ABI. TODO remove the need for this contract by allowing TESTAssetHolder to be deployed twice.
 */
contract TESTAssetHolder2 is TESTAssetHolder {
    /**
     * @notice Constructor function storing the AdjudicatorAddress.
     * @dev Constructor function storing the AdjudicatorAddress.
     * @param _AdjudicatorAddress Address of an Adjudicator  contract, supplied at deploy-time.
     */
    constructor(address _AdjudicatorAddress) public TESTAssetHolder(_AdjudicatorAddress) {}

    bool public dummy;
}
