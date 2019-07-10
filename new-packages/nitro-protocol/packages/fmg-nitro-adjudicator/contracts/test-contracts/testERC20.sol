pragma solidity ^0.5.2;
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract testERC20 is ERC20 {
    address winner = 0x57153E563526c1ce131E6af71ffFDA2C3A50b980;
        constructor() public {
        _mint(winner, 1000);
    }
}