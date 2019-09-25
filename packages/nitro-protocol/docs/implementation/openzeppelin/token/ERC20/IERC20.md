---
id: IERC20
title: IERC20
---

Interface of the ERC20 standard as defined in the EIP. Does not include
the optional functions; to access them see `ERC20Detailed`.

***
## Functions:
- [`totalSupply`](#totalSupply)
- [`balanceOf`](#balanceOf)
- [`transfer`](#transfer)
- [`allowance`](#allowance)
- [`approve`](#approve)
- [`transferFrom`](#transferFrom)
***
<a id=totalSupply />
## `totalSupply`

Returns the amount of tokens in existence.

#### Returns:
- `uint256`

<a id=balanceOf />
## `balanceOf`

Returns the amount of tokens owned by `account`.

#### Returns:
- `uint256`

<a id=transfer />
## `transfer`

Moves `amount` tokens from the caller's account to `recipient`.

Returns a boolean value indicating whether the operation succeeded.

Emits a `Transfer` event.

#### Returns:
- `bool`

<a id=allowance />
## `allowance`

Returns the remaining number of tokens that `spender` will be
allowed to spend on behalf of `owner` through `transferFrom`. This is
zero by default.

This value changes when `approve` or `transferFrom` are called.

#### Returns:
- `uint256`

<a id=approve />
## `approve`

Sets `amount` as the allowance of `spender` over the caller's tokens.

Returns a boolean value indicating whether the operation succeeded.

> Beware that changing an allowance with this method brings the risk
that someone may use both the old and the new allowance by unfortunate
transaction ordering. One possible solution to mitigate this race
condition is to first reduce the spender's allowance to 0 and set the
desired value afterwards:
https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729

Emits an `Approval` event.

#### Returns:
- `bool`

<a id=transferFrom />
## `transferFrom`

Moves `amount` tokens from `sender` to `recipient` using the
allowance mechanism. `amount` is then deducted from the caller's
allowance.

Returns a boolean value indicating whether the operation succeeded.

Emits a `Transfer` event.

#### Returns:
- `bool`


***
## Events:
- [`Transfer`](#Transfer)
- [`Approval`](#Approval)
***
<a id=Transfer />
## `Transfer`
Emitted when `value` tokens are moved from one account (`from`) to
another (`to`).

Note that `value` may be zero.

<a id=Approval />
## `Approval`
Emitted when the allowance of a `spender` for an `owner` is set by
a call to `approve`. `value` is the new allowance.

