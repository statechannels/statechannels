---
id: overview
title: Overview
---

Nitro handles the funding of channels.
It describes how the funds are held on-chain for a channel, how to interpret the channel outcomes to determine the payouts and how to execute those payouts.

In Nitro a payout is of one of two types: it is either a payout to a channel participant or it is a payout to another channel.
It is this second type of payout that allows channels to fund one another in Nitro, enabling the virtual channels that are used to build state channel networks.

## A system of balances

- deposits

## Outcomes

- allocation
- destination
- describe how payouts work in the allocation case

## Claim

- two types of outcomes
- transfer
- claim

## Contract topology

<div class="mermaid">
graph LR
linkStyle default interpolate basis
EOA-->|pushOutcome|NitroAdjudicator
EOA-->|approve|Token
EOA-->|transferAll, deposit|ETHAssetHolder
EOA-->|transferAll, deposit|ERC20AssetHolder
NitroAdjudicator-->|setOutcome| ETHAssetHolder
NitroAdjudicator-->|setOutcome| ERC20AssetHolder
ERC20AssetHolder-->|transfer, transferFrom| Token

</div>
