---
id: ERC20
title: ERC20.sol
original_id: ERC20
---

View Source: [@openzeppelin/contracts/token/ERC20/ERC20.sol](https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/@openzeppelin/contracts/token/ERC20/ERC20.sol)

**↗ Extends: [Context](Context.md), [IERC20](IERC20.md)**
**↘ Derived Contracts: [Token](Token.md)**

Implementation of the {IERC20} interface.
 This implementation is agnostic to the way tokens are created. This means
 that a supply mechanism has to be added in a derived contract using {_mint}.
 For a generic mechanism see {ERC20MinterPauser}.
 TIP: For a detailed writeup see our guide
 https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 to implement supply mechanisms].
 We have followed general OpenZeppelin guidelines: functions revert instead
 of returning `false` on failure. This behavior is nonetheless conventional
 and does not conflict with the expectations of ERC20 applications.
 Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 This allows applications to reconstruct the allowance for all accounts just
 by listening to said events. Other implementations of the EIP may not emit
 these events, as it isn't required by the specification.
 Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 functions have been added to mitigate the well-known issues around setting
 allowances. See {IERC20-approve}.

---

## Contract Members
**Constants & Variables**

```solidity
mapping(address => uint256) private _balances;
mapping(address => mapping(address => uint256)) private _allowances;
uint256 private _totalSupply;
string private _name;
string private _symbol;
uint8 private _decimals;

```

## Functions

- [](#)
- [name](#name)
- [symbol](#symbol)
- [decimals](#decimals)
- [totalSupply](#totalsupply)
- [balanceOf](#balanceof)
- [transfer](#transfer)
- [allowance](#allowance)
- [approve](#approve)
- [transferFrom](#transferfrom)
- [increaseAllowance](#increaseallowance)
- [decreaseAllowance](#decreaseallowance)
- [_transfer](#_transfer)
- [_mint](#_mint)
- [_burn](#_burn)
- [_approve](#_approve)
- [_setupDecimals](#_setupdecimals)
- [_beforeTokenTransfer](#_beforetokentransfer)

---

### 

Sets the values for {name} and {symbol}, initializes {decimals} with
 a default value of 18.
 To select a different value for {decimals}, use {_setupDecimals}.
 All three of these values are immutable: they can only be set once during
 construction.

```solidity
function (string name, string symbol) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| name | string |  | 
| symbol | string |  | 

### name

Returns the name of the token.

```solidity
function name() public view
returns(string)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### symbol

Returns the symbol of the token, usually a shorter version of the
 name.

```solidity
function symbol() public view
returns(string)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### decimals

Returns the number of decimals used to get its user representation.
 For example, if `decimals` equals `2`, a balance of `505` tokens should
 be displayed to a user as `5,05` (`505 / 10 ** 2`).
 Tokens usually opt for a value of 18, imitating the relationship between
 Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
 called.
 NOTE: This information is only used for _display_ purposes: it in
 no way affects any of the arithmetic of the contract, including
 {IERC20-balanceOf} and {IERC20-transfer}.

```solidity
function decimals() public view
returns(uint8)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### totalSupply

See {IERC20-totalSupply}.

```solidity
function totalSupply() public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### balanceOf

See {IERC20-balanceOf}.

```solidity
function balanceOf(address account) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| account | address |  | 

### transfer

See {IERC20-transfer}.
 Requirements:
 - `recipient` cannot be the zero address.
 - the caller must have a balance of at least `amount`.

```solidity
function transfer(address recipient, uint256 amount) public nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| recipient | address |  | 
| amount | uint256 |  | 

### allowance

See {IERC20-allowance}.

```solidity
function allowance(address owner, address spender) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| owner | address |  | 
| spender | address |  | 

### approve

See {IERC20-approve}.
 Requirements:
 - `spender` cannot be the zero address.

```solidity
function approve(address spender, uint256 amount) public nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| spender | address |  | 
| amount | uint256 |  | 

### transferFrom

See {IERC20-transferFrom}.
 Emits an {Approval} event indicating the updated allowance. This is not
 required by the EIP. See the note at the beginning of {ERC20};
 Requirements:
 - `sender` and `recipient` cannot be the zero address.
 - `sender` must have a balance of at least `amount`.
 - the caller must have allowance for ``sender``'s tokens of at least
 `amount`.

```solidity
function transferFrom(address sender, address recipient, uint256 amount) public nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| sender | address |  | 
| recipient | address |  | 
| amount | uint256 |  | 

### increaseAllowance

Atomically increases the allowance granted to `spender` by the caller.
 This is an alternative to {approve} that can be used as a mitigation for
 problems described in {IERC20-approve}.
 Emits an {Approval} event indicating the updated allowance.
 Requirements:
 - `spender` cannot be the zero address.

```solidity
function increaseAllowance(address spender, uint256 addedValue) public nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| spender | address |  | 
| addedValue | uint256 |  | 

### decreaseAllowance

Atomically decreases the allowance granted to `spender` by the caller.
 This is an alternative to {approve} that can be used as a mitigation for
 problems described in {IERC20-approve}.
 Emits an {Approval} event indicating the updated allowance.
 Requirements:
 - `spender` cannot be the zero address.
 - `spender` must have allowance for the caller of at least
 `subtractedValue`.

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) public nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| spender | address |  | 
| subtractedValue | uint256 |  | 

### _transfer

Moves tokens `amount` from `sender` to `recipient`.
 This is internal function is equivalent to {transfer}, and can be used to
 e.g. implement automatic token fees, slashing mechanisms, etc.
 Emits a {Transfer} event.
 Requirements:
 - `sender` cannot be the zero address.
 - `recipient` cannot be the zero address.
 - `sender` must have a balance of at least `amount`.

```solidity
function _transfer(address sender, address recipient, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| sender | address |  | 
| recipient | address |  | 
| amount | uint256 |  | 

### _mint

Creates `amount` tokens and assigns them to `account`, increasing
 the total supply.
 Emits a {Transfer} event with `from` set to the zero address.
 Requirements
 - `to` cannot be the zero address.

```solidity
function _mint(address account, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| account | address |  | 
| amount | uint256 |  | 

### _burn

Destroys `amount` tokens from `account`, reducing the
 total supply.
 Emits a {Transfer} event with `to` set to the zero address.
 Requirements
 - `account` cannot be the zero address.
 - `account` must have at least `amount` tokens.

```solidity
function _burn(address account, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| account | address |  | 
| amount | uint256 |  | 

### _approve

Sets `amount` as the allowance of `spender` over the `owner`s tokens.
 This is internal function is equivalent to `approve`, and can be used to
 e.g. set automatic allowances for certain subsystems, etc.
 Emits an {Approval} event.
 Requirements:
 - `owner` cannot be the zero address.
 - `spender` cannot be the zero address.

```solidity
function _approve(address owner, address spender, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| owner | address |  | 
| spender | address |  | 
| amount | uint256 |  | 

### _setupDecimals

Sets {decimals} to a value other than the default one of 18.
 WARNING: This function should only be called from the constructor. Most
 applications that interact with token contracts will not expect
 {decimals} to ever change, and may work incorrectly if it does.

```solidity
function _setupDecimals(uint8 decimals_) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| decimals_ | uint8 |  | 

### _beforeTokenTransfer

Hook that is called before any transfer of tokens. This includes
 minting and burning.
 Calling conditions:
 - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
 will be to transferred to `to`.
 - when `from` is zero, `amount` tokens will be minted for `to`.
 - when `to` is zero, `amount` of ``from``'s tokens will be burned.
 - `from` and `to` are never both zero.
 To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| from | address |  | 
| to | address |  | 
| amount | uint256 |  | 

