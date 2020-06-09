---
id: deposit-assets
title: Deposit Assets
---

Early on in the lifecycle of a state channel -- i.e. after exchanging some setup states, but before executing any application logic -- participants will want to "fund it". They will stake assets on the channel so that the state updates are meaningful. The simplest way to do this is with an on chain deposit: a more advanced possibility is fund a new channel from an existing funded channel.

To start, let's explore the on chain deposit case. We will need to understand how channels are uniquely identified.

## Compute a channel id

The id of a channel is the `keccak256` hash of the abi encoded `chainId`, `participants` and `channelNonce`.

By choosing a new `channelNonce` each time the same participants execute a state channel supported by the same chain, they can avoid replay attacks. The `getChannelId` helper exported by `@statechannels/nitro-protocol` accepts an object of type `Channel` (which contains all the necessary properties) and computes the channel id for you.

```typescript
// In lesson4.test.ts

// Import Ethereum utilities
import {Wallet} from 'ethers';

// Import statechannels utilities
import {Channel, getChannelId} from '@statechannels/nitro-protocol';

const participants = [];
for (let i = 0; i < 3; i++) {
  // As many participants as you like
  participants[i] = Wallet.createRandom().address;
}

const chainId = '0x1234'; // E.g. '0x1' for mainnnet. Using a mock here

const channelNonce = bigNumberify(0).toHexString();
const channel: Channel = {chainId, channelNonce, participants};
const channelId = getChannelId(channel);
```

## `deposit` into the ETH asset holder

The deposit method allows ETH to be escrowed against a channel.
We have the following call signature:

```solidity
function deposit(bytes32 destination, uint256 expectedHeld, uint256 amount) public payable
```

There are a few rules to obey when calling `deposit`. Firstly, `destination` must NOT be an [external destination](#destinations). Secondly, the on chain holdings for `destination` must be greater than or equal to `expectedHeld`. Thirdlt, the holdings for `destination` must be less than the sum of the amount expected to be held and the amount declared in the deposit.

Because we are depositing ETH, we must remember to send the right amount of ETH with the transaction. Depositing ERC20 tokens will be covered in a future tutorial.

```typescript
// In lesson5.test.ts

/*
    Get an appropriate representation of 1 wei, and
    use one of our helpers to quickly create a 
    random channel id for our deposit destination.
    WARNING: don't do this in the wild: you won't be able to recover these funds.
*/
const amount = parseUnits('1', 'wei');
const destination = randomChannelId();

/*
    Attempt to deposit 1 wei against the channel id we created.
    Inspect the error message in the console for a hint about the bug on the next line 
*/
const expectedHeld = 0;
const tx0 = ETHAssetHolder.deposit(destination, expectedHeld, amount, {
  value: amount,
});
```

## Destinations

A `Destination` is a `bytes32` and either:

1. A `ChannelId` (see the section on [channelId](#compute-a-channel-id)), or
2. An `ExternalDestination`, which is an ethereum address left-padded with zeros.

:::tip
In JavaScript, the `ExternalDestination` corresponding to `address` may be computed as

```
'0x' + address.padStart(64, '0')
```

or

```
ethers.utils.hexZeroPad(address, 32);
```

:::
