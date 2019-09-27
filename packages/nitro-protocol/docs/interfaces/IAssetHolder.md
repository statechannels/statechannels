---
id: IAssetHolder
title: IAssetHolder
---

An AssetHolder contract escrows eth or tokens against state channels. It allows assets to be deposited, and ultimately transferred from one channel to other channel and/or external addresses.

***
## Functions:
- [`transferAll`](#transferAll)
- [`claimAll`](#claimAll)
***
<a id=transferAll />
## `transferAll`

Transfers the funds escrowed against `channelId` and transfers them to the beneficiaries of that channel.

#### Parameters:
- `channelId`: Unique identifier for a state channel.

- `allocationBytes`: The abi.encode of AssetOutcome.Allocation


<a id=claimAll />
## `claimAll`

Transfers the funds escrowed against `guarantorChannelId` to the beneficiaries of the __target__ of that channel.

#### Parameters:
- `guarantorChannelId`: Unique identifier for a guarantor state channel.

- `guaranteeBytes`: The abi.encode of Outcome.Guarantee

- `allocationBytes`: The abi.encode of AssetOutcome.Allocation for the __target__



***
## Events:
- [`Deposited`](#Deposited)
- [`AssetTransferred`](#AssetTransferred)
***
<a id=Deposited />
## `Deposited`
Indicates that `amountDeposited` has been deposited into `destination`.

#### Parameters:
- `destination`: The channel being deposited into.

- `amountDeposited`: The amount being deposited.

- `destinationHoldings`: The new holdings for `destination`.

<a id=AssetTransferred />
## `AssetTransferred`
Indicates that `amount` assets have been transferred to the external adress denoted by `destination`.

#### Parameters:
- `destination`: An external address, right-padded with zeros.

- `amount`: Number of assets transferred (wei or tokens).

