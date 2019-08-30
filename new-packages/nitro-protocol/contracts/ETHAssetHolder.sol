pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;
import './Outcome.sol';
import './AssetHolder.sol';
contract ETHAssetHolder is AssetHolder {
    address AdjudicatorAddress;

    constructor(address _AdjudicatorAddress) public {
        AdjudicatorAddress = _AdjudicatorAddress;
    }

    modifier AdjudicatorOnly {
        require(msg.sender == AdjudicatorAddress, 'Only the NitroAdjudicator is authorized');
        _;
    }

    // **************
    // ETH and Token Management
    // **************

    function deposit(bytes32 destination, uint256 expectedHeld, uint256 amount) public payable {
        require(msg.value == amount, 'Insufficient ETH for ETH deposit');
        uint256 amountDeposited;
        // This protects against a directly funded channel being defunded due to chain re-orgs,
        // and allow a wallet implementation to ensure the safety of deposits.
        require(
            holdings[destination] >= expectedHeld,
            'Deposit | holdings[destination] is less than expected'
        );

        // If I expect there to be 10 and deposit 2, my goal was to get the
        // balance to 12.
        // In case some arbitrary person deposited 1 eth before I noticed, making the
        // holdings 11, I should be refunded 1.
        if (holdings[destination] == expectedHeld) {
            amountDeposited = amount;
        } else if (holdings[destination] < expectedHeld.add(amount)) {
            amountDeposited = expectedHeld.add(amount).sub(holdings[destination]);
        } else {
            amountDeposited = 0;
        }
        holdings[destination] = holdings[destination].add(amountDeposited);
        if (amountDeposited < amount) {
            // refund whatever wasn't deposited.
            msg.sender.transfer(amount - amountDeposited); // TODO use safeMath here
        }
        emit Deposited(destination, amountDeposited, holdings[destination]);
    }

    function withdraw(
        address participant,
        address payable destination,
        uint256 amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public payable {
        require(holdings[_addressToBytes32(participant)] >= amount, 'Withdraw: overdrawn');
        Authorization memory authorization = Authorization(
            participant,
            _addressToBytes32(destination),
            amount,
            msg.sender
        );

        require(
            recoverSigner(abi.encode(authorization), _v, _r, _s) == participant,
            'Withdraw: not authorized by participant'
        );

        holdings[_addressToBytes32(participant)] = holdings[_addressToBytes32(participant)].sub(
            amount
        );
        // Decrease holdings before calling to token contract (protect against reentrancy)
        destination.transfer(amount);
    }

    // function transferAndWithdraw(
    //     address channel,
    //     address participant,
    //     address payable destination,
    //     uint256 amount,
    //     uint8 _v,
    //     bytes32 _r,
    //     bytes32 _s
    // ) public payable {
    //     transfer(channel, participant, amount);
    //     withdraw(participant, destination, amount, _v, _r, _s);
    // }

}
