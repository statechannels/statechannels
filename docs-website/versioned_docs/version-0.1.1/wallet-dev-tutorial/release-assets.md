---
id: version-0.1.1-release-assets
title: Release assets
original_id: release-assets
---

If a channel has been finalized on chain, the adjudicator contract knows about the final outcome. This tutorial section covers pushing that outcome to the asset holder contract(s), which is a necessary step to releasing the assets.

## Using `pushOutcome`

A finalized outcome is stored in two places on chain: first, as a single hash in the adjudicator contract; second, in multiple hashes across multiple asset holder contracts.

The `pushOutcome` method on the `NitroAdjudicator` allows one or more `assetOutcomes` to be registered against a channel in a number of AssetHolder contracts (specified by the `outcome` stored against a channel that has been finalized in the adjudicator).

In this example we will limit ourselves to an outcome that specifies ETH only, and therefore will only be pushing the outcome to a single contract (the `ETHAssetHolder`).

Let us begin with a conclude transaction, following the steps in the tutorial section above. When we finalize a channel this way, the chain stores the timestamp of the current blocknumber. We need to extract this information from the transaction receipt in order to be able to push the outcome successfully.

```typescript
// In lesson13.test.ts

/* 
  Submit a conclude transaction
*/
const tx0 = NitroAdjudicator.conclude(
  largestTurnNum,
  fixedPart,
  appPartHash,
  outcomeHash,
  numStates,
  whoSignedWhat,
  sigs
);

/* 
  Store the receipt, which tells us about when the challenge was registered
*/
const receipt = await(await tx0).wait();
const finalizesAt = (await provider.getBlock(receipt.blockNumber)).timestamp;

/* 
  Form the arguments for the pushOutcome transaction
*/
const channelId = getChannelId(channel);

const stateHash = HashZero; // Reset in a happy conclude
const challengerAddress = AddressZero; // Reset in a happy conclude
const outcomeBytes = encodeOutcome(state.outcome);

const turnNumRecord = 0;

const tx1 = NitroAdjudicator.pushOutcome(
  channelId,
  turnNumRecord,
  finalizesAt,
  stateHash,
  challengerAddress,
  outcomeBytes
);

await(await tx1).wait();
```

## Using `transferAll`

The `transferAll` method is available on all asset holders, including the `ETHAssetHolder`. It pays out assets according to outcomes that it knows about, if the channel is sufficiently funded.

```typescript
// In lesson14.test.ts
import {encodeAllocation} from '@statechannels/nitro-protocol';

const amount = '0x03';

const EOA = ethers.Wallet.createRandom().address;
const destination = hexZeroPad(EOA, 32);

const assetOutcome: AllocationAssetOutcome = {
  assetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [{destination, amount}],
};

// Following earlier tutorials ...
// tx0 fund a channel
// tx1 conclude this channel with this outcome
// tx2 pushOutcome to the ETH_ASSET_HOLDER
// ...

const tx3 = ETHAssetHolder.transferAll(channelId, encodeAllocation(assetOutcome.allocationItems));

/* 
  Check that an AssetTransferred event was emitted.
*/
const {events} = await(await tx3).wait();
expect(events).toMatchObject([
  {
    event: 'AssetTransferred',
    args: {
      channelId,
      destination: destination.toLowerCase(),
      amount: {_hex: amount},
    },
  },
]);

expect(bigNumberify(await provider.getBalance(EOA)).eq(bigNumberify(amount)));
```

:::tip
If the destination specified in the outcome is external, the asset holder pays out the funds (as in the example above). Otherwise the destination is a channel id, and the contract updates its internal accounting such that this channel has its direct funding increased.
:::

:::tip
This method executes payouts that might benefit multiple participants. If multiple actors try and call this method, after the first transaction is confirmed the remaining ones may fail.
:::

## Using `claimAll`

The `claimAll` method will pay out the funds held against a guarantor channel, according to a _target_ channel's outcome but with an preference order controlled by the guarantor channel.

```typescript
// In lesson15.test.ts

const amount = '0x03';
const EOA1 = ethers.Wallet.createRandom().address;
const EOA2 = ethers.Wallet.createRandom().address;
const destination1 = hexZeroPad(EOA1, 32);
const destination2 = hexZeroPad(EOA2, 32);

const assetOutcomeForTheTargetChannel: AllocationAssetOutcome = {
  assetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [
    {destination: destination1, amount},
    {destination: destination2, amount},
  ],
};

const assetOutcomeForTheGuarantorChannel: GuaranteeAssetOutcome = {
  assetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  guarantee: {
    targetChannelId: targetChannelId,
    destinations: [
      destination2,
      destination1, // Note reversed order
    ],
  },
};

// Following earlier tutorials ...
// tx0 finalize a channel that allocates to Alice then Bob
// tx1 pushOutcome to the ETH_ASSET_HOLDER
// tx2 finalize a guarantor channel that targets the first channel
// and reprioritizes Bob over Alice
// tx3 pushOutcome to the ETH_ASSET_HOLDER
// tx4 fund the _guarantor_ channel, not the target channel
// with a deposit that only covers one of the payouts
// check that Bob got his payout
// ...

/*
    Submit claimAll transaction
  */
const tx5 = ETHAssetHolder.claimAll(
  guarantorChannelId,
  encodeGuarantee(assetOutcomeForTheGuarantorChannel.guarantee),
  encodeAllocation(assetOutcomeForTheTargetChannel.allocationItems)
);

await(await tx5).wait();
/* 
  Check that the ethereum account balance was updated
*/
expect(bigNumberify(await provider.getBalance(EOA2)).eq(bigNumberify(amount)));
```

If this process seems overly complicated to you: remember that guarantor channels are only required when virtually funding a channel. Also bear in mind that this process is unlinkely to actually play out on chain very often: it is in everyone's interest to administrate inter-channel funding off chain as much as possible, with the on chain administration such as this used as a last resort.

## Using `pushOutcomeAndTransferAll`

Instead of pushing the outcome from the adjudicator to the asset holder in one transaction, and _then_ transferring the assets out of a channel according to that outcome, it is more convenient to use the adjudicator's `pushOutcomeAndTransferfAll` method, which will do both in one go and save gas, to boot.

## Using `concludePushOutcomeAndTransferAll`

If we have a finalization proof, then we can call `condludePushOutcomeAndTransferAll` to do the channel close, outcome push and payouts in one transaction.
