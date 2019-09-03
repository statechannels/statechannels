pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;
import './Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract AssetHolder {
    using SafeMath for uint256;

    struct Authorization {
        // Prevents replay attacks:
        // It's required that the participant signs the message, meaning only
        // the participant can authorize a withdrawal.
        // Moreover, the participant should sign the address that they wish
        // to send the transaction from, preventing any replay attack.
        address participant; // the account used to sign commitment transitions
        address destination; // either an account or a channel
        uint256 amount;
        address sender; // the account used to sign transactions
    }

    address AdjudicatorAddress;

    mapping(bytes32 => uint256) public holdings;

    mapping(bytes32 => bytes32) public outcomeHashes;

    // **************
    // Public methods
    // **************

    function transferAll(bytes32 channelId, Outcome.AllocationItem[] memory allocation) public {
        // requirements
        require(
            outcomeHashes[channelId] ==
                keccak256(
                    abi.encode(
                        Outcome.LabelledAllocationOrGuarantee(
                            uint8(Outcome.OutcomeType.Allocation),
                            abi.encode(allocation)
                        )
                    )
                ),
            'transferAll | submitted data does not match stored outcomeHash'
        );

        uint256 balance = holdings[channelId];
        Outcome.AllocationItem[] memory payouts;
        Outcome.AllocationItem[] memory newAllocation;
        uint256 j = 0;
        for (uint256 i = 0; i < allocation.length; i++) {
            if (balance == 0) {
                newAllocation[i] = Outcome.AllocationItem(
                    allocation[i].destination,
                    allocation[i].amount
                );
                j++;
            } else {
                payouts[i] = Outcome.AllocationItem(
                    allocation[i].destination,
                    allocation[i].amount
                );
                if (balance <= allocation[i].amount) {
                    newAllocation[j] = Outcome.AllocationItem(
                        allocation[i].destination,
                        allocation[i].amount - balance
                    );
                    balance = 0;
                } else {
                    payouts[i] = Outcome.AllocationItem(
                        allocation[i].destination,
                        allocation[i].amount
                    );
                    balance -= allocation[i].amount;
                }
            }
        }

        // effects
        holdings[channelId] = balance;
        if (newAllocation.length > 0) {
            outcomeHashes[channelId] = keccak256(abi.encode(newAllocation));
        } else {
            delete outcomeHashes[channelId];
        }

        // holdings updated BEFORE asset transferred (prevent reentrancy)
        for (uint256 i = 0; i < payouts.length; i++) {
            if (_isExternalAddress(payouts[i].destination)) {
                _transferAsset(_bytes32ToAddress(payouts[i].destination), payouts[i].amount);
            } else {
                holdings[payouts[i].destination] =
                    holdings[payouts[i].destination] +
                    payouts[i].amount;
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
