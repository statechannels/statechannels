---
id: single-asset-payments
title: SingleAssetPayments.sol
---

Although Nitro supports a mixture of ETH and ERC20 tokens to be escrowed into a channel, a simple payment application would most likely be restricted to a single asset type. There is no `appData` for such an application, as the state machine is encoded only by conditions on the default outcome of each state update. In short, when it is your move you may unilaterally transfer some of the assets that are currently allocated to you, to another participant. You may not decrease any other participants allocation.

## Implementation

Please see the [API](../contract-api/natspec/SingleAssetPayments).

- Decode the information
- Revert if (on either state):
  - There is more than one asset encoded
  - The `assetOutcome` is not an allocation
  - The `allocation` has exactly `nParticipants` outcomes
- Checks that the sum of assets has not changed
- For all non-movers, check:
  - The allocation amount has not decreased
  - The destination has not changed
- For the mover, check:
  - [optional / not implemented] the destination has not changed
  - [redundant] the balance has not increased (covered by the sum + other balances not decreasing)

:::warning
This implementation assumes that the participant in position `k := turnNumB % nParticipants` has the right to decrease the balance of `allocation[k].destination`. When opening the channel, each client should check they are happy with this before proceeding with channel funding. In most applications one would have `allocation[k].destination = participants[k]`.
:::
