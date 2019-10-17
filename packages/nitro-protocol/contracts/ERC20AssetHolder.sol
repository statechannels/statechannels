pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;
import './AssetHolder.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract ERC20AssetHolder is AssetHolder {
    address AdjudicatorAddress;
    IERC20 Token;

    constructor(address _AdjudicatorAddress, address _TokenAddress) public {
        AdjudicatorAddress = _AdjudicatorAddress;
        Token = IERC20(_TokenAddress);
    }

    modifier AdjudicatorOnly {
        require(msg.sender == AdjudicatorAddress, 'Only the NitroAdjudicator is authorized');
        _;
    }

    function deposit(bytes32 destination, uint256 expectedHeld, uint256 amount) public {
        require(!_isExternalDestination(destination), 'Cannot deposit to external destination');
        uint256 amountDeposited;
        // this allows participants to reduce the wait between deposits, while protecting them from losing funds by depositing too early. Specifically it protects against the scenario:
        // 1. Participant A deposits
        // 2. Participant B sees A's deposit, which means it is now safe for them to deposit
        // 3. Participant B submits their deposit
        // 4. The chain re-orgs, leaving B's deposit in the chain but not A's
        require(
            holdings[destination] >= expectedHeld,
            'Deposit | holdings[destination] is less than expected'
        );
        require(
            holdings[destination] < expectedHeld.add(amount),
            'Deposit | holdings[destination] already meets or exceeds expectedHeld + amount'
        );

        // The depositor wishes to increase the holdings against channelId to amount + expectedHeld
        // The depositor need only deposit (at most) amount + (expectedHeld - holdings) (the term in parentheses is non-positive)

        amountDeposited = expectedHeld.add(amount).sub(holdings[destination]); // strictly positive
        // require successful deposit before updating holdings (protect against reentrancy)
        require(
            Token.transferFrom(msg.sender, address(this), amountDeposited),
            'Could not deposit ERC20s'
        );
        holdings[destination] = holdings[destination].add(amountDeposited);
        emit Deposited(destination, amountDeposited, holdings[destination]);
    }

    function _transferAsset(address payable destination, uint256 amount) internal {
        Token.transfer(destination, amount);
    }

}
