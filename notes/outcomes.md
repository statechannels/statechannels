# Outcomes

The wallet currently uses two types of outcomes.

```typescript
interface SimpleGuarantee {
  type: 'SimpleGuarantee';
  targetChannelId: string;
  assetHolderAddress: string;
  destinations: string[];
}

interface SimpleAllocation {
  type: 'SimpleAllocation';
  assetHolderAddress: string;
  allocationItems: {destination: Destination; amount: BigNumber}[];
}
```

The outcome determines what happens to funds in a channel, when the channel is finalized.
This is explained in detail in the [nitro paper](https://magmo.com/nitro-protocol.pdf).

- For simple allocations, `amount` is _transferred_ to `destination`
  - In case the channel is _underfunded_ -- the holdings are less than the sum of `amount` over the allocation items -- allocation items are prioritized by their order
- For simple guarantees, funds are transferred according to the outcome of the `targetChannelId`
  - :warning: If the target channel does not have a simple allocation outcome, things will break.
  - In case the guarantor channell is _underfunded_ -- the holdings are less than the sum of `amount` over the allocation items of `guarantee.targetChannelId` -- allocation items are prioritized by the order in `guarantee.destinations`
  - In practice, guarantor channels are _all_ underfunded
    - they only cover a portion of the allocations of the target channel

# Updating outcomes

When the wallet is asked to sign a state `s'`, the wallet should ensure that one of four things is true:

1. a) the wallet has not yet signed a state for that channel.
   b) outcome on `s'` is "suitable" for the channel's purpose.
   Cases (1) happens for both app channels and funding channels, when setting up the channel.
2. a) The wallet has signed a (latest) state `s` for that channel.
   b) `s.outcome === s'.outcome`
   Case (2) happens for app channels when setting up the channel (the "post-fund-setup" state) and when concluding the channel.
   Case (2) also happens for ledger channels, but only when closing the channel.
3. a) The wallet has signed a (latest) state `s` for that channel.
   b) `s.outcome !== s'.outcome`, but due to the state of other channels in the store, the user's funds remain invariant
   Case (3) _only_ happens in "funding" channels (ledger, joint, and guarantor channels).
4. a) The wallet has signed a (latest) state `s` for that channel.
   b) The app requested to update the outcome to `s'.outcome`
   c) `validTransition(s, s')` is true
   Case (4) _only_ happens for application channels, and _only_ when in the application workflow's `'running'` state.

### Notes

- The wallet should _never_ change the outcome from a guarantee to an allocation.
- Currently, the wallet onyl supports eth.
  - It may soon support channels with other (ERC20) tokens, but only one token.
  - It will eventually support channels with multiple tokens. In this case, (only?) application channels may have a "mixed" outcome

```typescript
interface MixedAllocation {
  type: 'MixedAllocation';
  simpleAllocations: SimpleAllocation[];
}
```
