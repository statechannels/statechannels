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

    function transferAll(bytes32 channelId, bytes calldata allocationBytes) external {
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
        uint256 numPayouts = 0;
        uint256 numNewAllocationItems = allocation.length;
        uint256 _amount;
        bool overlap;
        uint256 finalPayoutAmount;
        uint256 firstNewAllocationItemAmount;

        for (uint256 i = 0; i < allocation.length; i++) {
            if (balance == 0) { // if funds are completely depleted, keep the allocationItem and do not pay out
            } else {
                _amount = allocation[i].amount;
                if (balance < _amount) { // if funds still exist but are insufficient for this allocationItem, payout what's available and keep the allocationItem (but reduce the amount allocated)
                    // this block is never executed more than once
                    numPayouts++;
                    overlap = true;
                    finalPayoutAmount = balance;
                    firstNewAllocationItemAmount = _amount - balance;
                    balance = 0;
                } else { // if ample funds still exist, pay them out and discard the allocationItem
                    numPayouts++;
                    numNewAllocationItems--;
                    balance = balance.sub(_amount);
                }
            }
        }

        // effects
        holdings[channelId] = balance;

        if (numNewAllocationItems > 0) {
            // construct newAllocation
            Outcome.AllocationItem[] memory newAllocation = new Outcome.AllocationItem[](numNewAllocationItems);
            for (uint256 k = 0; k < numNewAllocationItems; k++){
                newAllocation[k] = allocation[allocation.length - numNewAllocationItems + k];
                if (overlap && k == 0) {
                    newAllocation[k].amount = firstNewAllocationItemAmount;
                }
            }

            // store hash
            outcomeHashes[channelId] = keccak256(abi.encode(
                Outcome.LabelledAllocationOrGuarantee(
                            uint8(Outcome.OutcomeType.Allocation),
                            abi.encode(newAllocation)
                        )
                    )
                );
        } else {
            delete outcomeHashes[channelId];
        }

        // holdings updated BEFORE asset transferred (prevent reentrancy)
        uint256 payoutAmount;
        for (uint256 m = 0; m < numPayouts; m++) { 
            if (overlap && m == numPayouts -1) {
                payoutAmount = finalPayoutAmount;
            } else {
                payoutAmount = allocation[m].amount;
            }
            if (_isExternalAddress(allocation[m].destination)) {
                _transferAsset(_bytes32ToAddress(allocation[m].destination), payoutAmount);
                emit AssetTransferred(allocation[m].destination, payoutAmount);
            } else {
                holdings[allocation[m].destination] += payoutAmount;
            }
        }

    }

    function claimAll(bytes32 channelId, bytes32 guaranteedChannelId, bytes calldata guaranteeBytes, bytes calldata allocationBytes) external {
        // requirements

        require(
            outcomeHashes[channelId] ==
                keccak256(
                    abi.encode(
                        Outcome.LabelledAllocationOrGuarantee(
                            uint8(Outcome.OutcomeType.Guarantee),
                            guaranteeBytes
                        )
                    )
                ),
            'claimAll | submitted data does not match outcomeHash stored against channelId'
        );

        require(
            outcomeHashes[guaranteedChannelId] ==
                keccak256(
                    abi.encode(
                        Outcome.LabelledAllocationOrGuarantee(
                            uint8(Outcome.OutcomeType.Allocation),
                            allocationBytes
                        )
                    )
                ),
            'claimAll | submitted data does not match outcomeHash stored against guaranteedChannelId'
        );

        uint256 balance = holdings[channelId];

        Outcome.AllocationItem[] memory allocation = abi.decode(allocationBytes,(Outcome.AllocationItem[])); // this remains constant length
        Outcome.Guarantee memory guarantee = abi.decode(guaranteeBytes,(Outcome.Guarantee));
        uint256[] memory payouts = new uint256[](allocation.length);
        uint256 newAllocationLength = allocation.length;

        // first increase payouts according to guarantee
        for (uint256 i = 0; i < guarantee.destinations.length; i++) { // for each destination in the guarantee
            bytes32 _destination = guarantee.destinations[i];
            if (balance == 0) {
                break;
            }
            for (uint256 j = 0; j < allocation.length; j++) { 
                if (_destination == allocation[j].destination) {  // find amount allocated to that destination (if it exists in channel alllocation)
                    uint256 _amount = allocation[j].amount;
                    if (balance >= _amount) {
                        payouts[j] += _amount;
                        allocation[j].amount = 0; // subtract _amount;
                        newAllocationLength--; 
                        balance -= _amount;
                        break;
                    } else { 
                        payouts[j] += balance;
                        allocation[j].amount = _amount - balance;
                        balance = 0;
                        break;
                    }
                }
            }
        }

        // next, increase payouts according to original allocation order
        for (uint256 j = 0; j < allocation.length; j++) { // for each destination in the guarantee
            if (balance == 0) {
                break;
            }   
            uint256 _amount = allocation[j].amount;
            if (balance >= _amount) {
                payouts[j] += _amount;
                allocation[j].amount = 0; // subtract _amount;
                newAllocationLength--;
                balance -= _amount;
                break;
            } else { 
                payouts[j] += balance;
                allocation[j].amount = _amount - balance;
                balance = 0;
                break;
            }
        }
        
        // effects
        holdings[channelId] = balance;

        // at this point have payouts array of uint256s, each corresponding to original destinations
        // and allocations has some zero amounts which we want to prune
        Outcome.AllocationItem[] memory newAllocation;
        if (newAllocationLength > 0) {
            newAllocation = new Outcome.AllocationItem[](newAllocationLength);
        }

        uint256 k = 0;
        for (uint256 j = 0; j < allocation.length; j++) { // for each destination in the guarantee
            if (payouts[j] > 0) {
                if (_isExternalAddress(allocation[j].destination)) {
                    _transferAsset(_bytes32ToAddress(allocation[j].destination), payouts[j]);
                    emit AssetTransferred(allocation[j].destination, payouts[j]);
                } else {
                    holdings[allocation[j].destination] += payouts[j];
                }
            }
            if (allocation[j].amount > 0 && newAllocationLength > 0) {
                newAllocation[k] = allocation[j];
                k++;
            }
        }
        assert(k == newAllocationLength);


        if (newAllocationLength > 0) {
            // store hash
            outcomeHashes[guaranteedChannelId] = keccak256(abi.encode(
                Outcome.LabelledAllocationOrGuarantee(
                            uint8(Outcome.OutcomeType.Allocation),
                            abi.encode(newAllocation)
                        )
                    )
                );
        } else {
            delete outcomeHashes[channelId];
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
    event AssetTransferred(
        bytes32 indexed destination,
        uint256 amount
    );

}
