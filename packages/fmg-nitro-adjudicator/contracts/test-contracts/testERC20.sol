pragma solidity ^0.5.2;
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract testERC20 is ERC20 {
            constructor() public {
        _mint(msg.sender, 10000);
    }
}