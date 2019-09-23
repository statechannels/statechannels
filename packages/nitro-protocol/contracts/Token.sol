pragma solidity ^0.5.11;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract Token is ERC20 {
  constructor() public {
    _mint(msg.sender, 10000);
  }
}
