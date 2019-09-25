---
id: ERC20
title: ERC20
---

Implementation of the `IERC20` interface.

This implementation is agnostic to the way tokens are created. This means
that a supply mechanism has to be added in a derived contract using `_mint`.
For a generic mechanism see `ERC20Mintable`.

*For a detailed writeup see our guide [How to implement supply
mechanisms](https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226).*

We have followed general OpenZeppelin guidelines: functions revert instead
of returning `false` on failure. This behavior is nonetheless conventional
and does not conflict with the expectations of ERC20 applications.

Additionally, an `Approval` event is emitted on calls to `transferFrom`.
This allows applications to reconstruct the allowance for all accounts just
by listening to said events. Other implementations of the EIP may not emit
these events, as it isn't required by the specification.

Finally, the non-standard `decreaseAllowance` and `increaseAllowance`
functions have been added to mitigate the well-known issues around setting
allowances. See `IERC20.approve`.

***
## Functions:
- [`totalSupply`](#totalSupply)
- [`balanceOf`](#balanceOf)
- [`transfer`](#transfer)
- [`allowance`](#allowance)
- [`approve`](#approve)
- [`transferFrom`](#transferFrom)
- [`increaseAllowance`](#increaseAllowance)
- [`decreaseAllowance`](#decreaseAllowance)
- [`_transfer`](#_transfer)
- [`_mint`](#_mint)
- [`_burn`](#_burn)
- [`_approve`](#_approve)
- [`_burnFrom`](#_burnFrom)
***
<a id=totalSupply />
## `totalSupply`

See `IERC20.totalSupply`.

#### Returns:
- `uint256`

<a id=balanceOf />
## `balanceOf`

See `IERC20.balanceOf`.

#### Returns:
- `uint256`

<a id=transfer />
## `transfer`

See `IERC20.transfer`.

Requirements:

- `recipient` cannot be the zero address.
- the caller must have a balance of at least `amount`.

#### Returns:
- `bool`

<a id=allowance />
## `allowance`

See `IERC20.allowance`.

#### Returns:
- `uint256`

<a id=approve />
## `approve`

See `IERC20.approve`.

Requirements:

- `spender` cannot be the zero address.

#### Returns:
- `bool`

<a id=transferFrom />
## `transferFrom`

See `IERC20.transferFrom`.

Emits an `Approval` event indicating the updated allowance. This is not
required by the EIP. See the note at the beginning of `ERC20`;

Requirements:
- `sender` and `recipient` cannot be the zero address.
- `sender` must have a balance of at least `value`.
- the caller must have allowance for `sender`'s tokens of at least
`amount`.

#### Returns:
- `bool`

<a id=increaseAllowance />
## `increaseAllowance`

Atomically increases the allowance granted to `spender` by the caller.

This is an alternative to `approve` that can be used as a mitigation for
problems described in `IERC20.approve`.

Emits an `Approval` event indicating the updated allowance.

Requirements:

- `spender` cannot be the zero address.

#### Returns:
- `bool`

<a id=decreaseAllowance />
## `decreaseAllowance`

Atomically decreases the allowance granted to `spender` by the caller.

This is an alternative to `approve` that can be used as a mitigation for
problems described in `IERC20.approve`.

Emits an `Approval` event indicating the updated allowance.

Requirements:

- `spender` cannot be the zero address.
- `spender` must have allowance for the caller of at least
`subtractedValue`.

#### Returns:
- `bool`

<a id=_transfer />
## `_transfer`

Moves tokens `amount` from `sender` to `recipient`.

This is internal function is equivalent to `transfer`, and can be used to
e.g. implement automatic token fees, slashing mechanisms, etc.

Emits a `Transfer` event.

Requirements:

- `sender` cannot be the zero address.
- `recipient` cannot be the zero address.
- `sender` must have a balance of at least `amount`.


<a id=_mint />
## `_mint`

Creates `amount` tokens and assigns them to `account`, increasing
the total supply.

Emits a `Transfer` event with `from` set to the zero address.

Requirements

- `to` cannot be the zero address.


<a id=_burn />
## `_burn`

Destoys `amount` tokens from `account`, reducing the
total supply.

Emits a `Transfer` event with `to` set to the zero address.

Requirements

- `account` cannot be the zero address.
- `account` must have at least `amount` tokens.


<a id=_approve />
## `_approve`

Sets `amount` as the allowance of `spender` over the `owner`s tokens.

This is internal function is equivalent to `approve`, and can be used to
e.g. set automatic allowances for certain subsystems, etc.

Emits an `Approval` event.

Requirements:

- `owner` cannot be the zero address.
- `spender` cannot be the zero address.


<a id=_burnFrom />
## `_burnFrom`

Destoys `amount` tokens from `account`.`amount` is then deducted
from the caller's allowance.

See `_burn` and `_approve`.



***
***
