// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import './AssetHolder.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @dev Ther ERC20AssetHolder contract extends the AssetHolder contract, and adds the following functionality: it allows ERC20 tokens to be escrowed against a state channelId and to be transferred to external destinations.
 */
contract ERC20AssetHolder is AssetHolder {
    using SafeMath for uint256;

    IERC20 public Token;
    
    /**
     * @notice Constructor function storing the AdjudicatorAddress and instantiating an interface to an ERC20 Token contract.
     * @dev Constructor function storing the AdjudicatorAddress and instantiating an interface to an ERC20 Token contract.
     * @param _AdjudicatorAddress Address of an Adjudicator  contract, supplied at deploy-time.
     * @param _TokenAddress Address of an ERC20 Token  contract, supplied at deploy-time.
     */
    constructor(address _AdjudicatorAddress, address _TokenAddress) public {
        AdjudicatorAddress = _AdjudicatorAddress;
        Token = IERC20(_TokenAddress);
    }

    /**
     * @notice Deposit ERC20 tokens against a given destination.
     * @dev Deposit ERC20 tokens against a given destination.
     * @param destination ChannelId to be credited.
     * @param expectedHeld The amount of tokens that the depositor believes are _already_ escrowed against the channelId.
     * @param amount The intended number of tokens to be deposited.
     */
    function deposit(
        bytes32 destination,
        uint256 expectedHeld,
        uint256 amount
    ) public {
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

    /**
     * @notice Transfers the given amount of ERC20 tokens to a supplied ethereum address.
     * @dev Transfers the given amount of ERC20 tokens to a supplied ethereum address.
     * @param destination Ethereum address to be credited.
     * @param amount Quantity of tokens to be transferred.
     */
    function _transferAsset(address payable destination, uint256 amount) internal override {
        Token.transfer(destination, amount);
    }
}
