---
id: payment-game
title: Single Asset Payment Game
---

How would a payment game work with this setup? Idea: we can restrict it to single asset.

- Throws if more than one asset
- Throws unless the assetoutcome is an allocation
- Throws unless that allocation has exactly n outcomes
- Interprets the nth outcome as belonging to participant n
- Checks that the sum of assets hasn't changed
- And that for all non-movers
  - the balance hasn't decreased
  - the destination hasn't changed
- For the mover:
  - [optional] the destination hasn't changed
  - [redundant] the balance hasn't increased (covered by the sum + other balances not decreasing)
