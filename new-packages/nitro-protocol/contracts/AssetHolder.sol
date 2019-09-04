pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;
import './Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract AssetHolder {
    using SafeMath for uint256;

    address AdjudicatorAddress;

    mapping(bytes32 => uint256) public holdings;

    mapping(bytes32 => bytes32) public outcomeHashes;

    // **************
    // Public methods
    // **************

    function transferAll(bytes32 channelId, bytes memory allocationBytes, uint256 newAllocationLength) public {
        // requirements
        require(
            outcomeHashes[channelId] ==
                keccak256(
                    abi.encode(
                        Outcome.LabelledAllocationOrGuarantee(
                            uint8(Outcome.OutcomeType.Allocation),
                            allocationBytes
                        )
                    )
                ),
            'transferAll | submitted data does not match stored outcomeHash'
        );

        Outcome.AllocationItem[] memory allocation = abi.decode(allocationBytes, (Outcome.AllocationItem[]));
        uint256 balance = holdings[channelId];
        Outcome.AllocationItem[] memory payouts = new Outcome.AllocationItem[](allocation.length); // we need to fix the length now; this is an upper bound so we may end up with empty slots
        Outcome.AllocationItem[] memory newAllocation = new Outcome.AllocationItem[](allocation.length); // we need to fix the length now; this is an upper bound so we may end up with empty slots
        bytes32 _destination;
        uint256 _amount;
        uint256 j = 0;
        uint256 k = 0;

        for (uint256 i = 0; i < allocation.length; i++) {
            if (balance == 0) { // if funds are completely depleted, keep the allocationItem
                newAllocation[j] = allocation[i];
                j++;
            } else {
                _amount = allocation[i].amount;
                if (balance < _amount) { // if funds still exist but are insufficient for this allocationItem, payout what's available and keep the allocationItem (but reduce the amount allocated)
                    // this block is never executed more than once
                    _destination = allocation[i].destination;

                    Outcome.AllocationItem memory payoutItem = Outcome.AllocationItem(_destination, balance);
                    payouts[k] = payoutItem;  
                    k++;

                    Outcome.AllocationItem memory newAllocationItem = Outcome.AllocationItem(_destination, _amount.sub(balance));
                    newAllocation[j] = newAllocationItem;
                    j++; 

                    balance = 0;
                } else { // if ample funds still exist, pay them out and discard the allocationItem
                    payouts[k] = allocation[i];
                    k++;

                    balance = balance.sub(_amount);
                }
            }
        }

        // k tracks how many times we wrote to the payouts array (there are no gaps)
        // j tracks how many times we wrote to the newAllocation array (there are no gaps)

        // effects
        holdings[channelId] = balance;

        if (j > 0) {

            // trim newAllocation
            Outcome.AllocationItem[] memory trimmedNewAllocation = new Outcome.AllocationItem[](newAllocationLength);

            // for(uint256 n=0; n<j; n++){
            //     trimmedNewAllocation[n] = newAllocation[n];
            // }

            // store hash of trimmed version
            outcomeHashes[channelId] = keccak256(abi.encode(trimmedNewAllocation));
        } else {
            delete outcomeHashes[channelId];
        }

        // holdings updated BEFORE asset transferred (prevent reentrancy)
        for (uint256 m = 0; m < k; k++) { // only iterate of actual payouts, not the empty slots
            if (_isExternalAddress(payouts[k].destination)) {
                _transferAsset(_bytes32ToAddress(payouts[k].destination), payouts[k].amount);
            } else {
                holdings[payouts[k].destination] =
                    holdings[payouts[k].destination] +
                    payouts[k].amount;
            }
        }

    }

    // **************
    // Permissioned methods
    // **************

    modifier AdjudicatorOnly {
        require(msg.sender == AdjudicatorAddress, 'Only the NitroAdjudicator is authorized');
        _;
    }

    function _setOutcome(bytes32 channelId, bytes32 outcomeHash) internal {
        require(outcomeHashes[channelId] == bytes32(0), 'Outcome hash already exists');
        outcomeHashes[channelId] = outcomeHash;
    }

    function setOutcome(bytes32 channelId, bytes32 outcomeHash)
        external
        AdjudicatorOnly
        returns (bool success)
    {
        _setOutcome(channelId, outcomeHash);
        return true;
    }

    // **************
    // Internal methods
    // **************

    function _transferAsset(address payable destination, uint256 amount) internal {}

    function _isExternalAddress(bytes32 destination) internal pure returns (bool) {
        return (destination == bytes32(bytes20(destination)));
    }

    function _addressToBytes32(address participant) internal pure returns (bytes32) {
        return bytes32(bytes20(participant));
    }

    function _bytes32ToAddress(bytes32 destination) internal pure returns (address payable) {
        return address(bytes20(destination));
    }

    function recoverSigner(bytes memory _d, uint8 _v, bytes32 _r, bytes32 _s)
        internal
        pure
        returns (address)
    {
        bytes memory prefix = '\x19Ethereum Signed Message:\n32';
        bytes32 h = keccak256(_d);

        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, h));

        address a = ecrecover(prefixedHash, _v, _r, _s);

        return (a);
    }

    // ****************
    // Events
    // ****************
    event Deposited(
        bytes32 indexed destination,
        uint256 amountDeposited,
        uint256 destinationHoldings
    );

}
