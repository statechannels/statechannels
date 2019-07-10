pragma solidity ^0.5.2;
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract testERC20 is ERC20 {
    mapping (address => uint256) private _balances;
    uint256 private _totalSupply;
    address winner = 0x57153E563526c1ce131E6af71ffFDA2C3A50b980;
constructor() public {
    _totalSupply = 1000000;
    _balances[winner] = 100;
    }
}