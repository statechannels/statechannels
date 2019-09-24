---
id: nitro-intro
title: Introduction to Nitro
---

Welcome to the **Nitro** state channel protocol specification. This documentation site outlines the technical specifications required by developers who wish to implement or build on top of Nitro. It is intended to complement the Nitro [white-paper](https://eprint.iacr.org/2019/219).

:::tip
State channels are a technique for increasing throughput for Decentralized Applications (DApps) supported by a blockchain. For an introduction to state channels, see this [blog post](https://education.district0x.io/general-topics/understanding-ethereum/basics-state-channels/).
:::

State channels are defined by both on-chain and off-chain behavior. In the case of Nitro, on-chain behavior is instantiated by a number of smart contracts written in [solidity](https://github.com/ethereum/solidity), and off-chain behavior by cryptographically signed messages exchanged by channel participants. **This documentation site aims to explain and specify the format to which these behaviors should adhere**.

Nitro protocol combines a state-channel adjudication protocol (known as ForceMove) with a state channel network protocol. Each of these components is implemented with a separate smart contract, designed to be deployed to the Ethereum blockchain. Participants interface with the adjudicator contract in order to resolve disputes and arrive at a final outcome for a single state channel, and interface with the asset-holder contract(s) to deposit into and withdraw ETH and/or tokens from that state channel or from a network of inter-funded channels.

The asset-holder contracts describe how ETH and/or tokens are held on-chain for any given channel, and how to interpret the channel outcomes in order to determine and execute any payouts that are due.

In Nitro a payout is of one of two types: it is either a payout to a channel participant or it is a payout to another channel. It is this second type of payout that allows channels to fund one another in Nitro, enabling the virtual channels that are used to build state channel networks.

## Account topology

The below diagram show various transactions connect externally owned accounts; and adjudicator, asset-holder and token contract accounts deployed to the Ethereum blockchain. Clicking on the contract account will take you to the source code for that contract.

<div class="mermaid">
graph LR
linkStyle default interpolate basis
A["Adjudicator"]
EOA["EOA"]
EOA-->|forceMove|A
EOA-->|respond|A
EOA-->|refute|A
EOA-->|conclude|A
EOA-->|pushOutcome|A
EOA-->|deposit|ETHAssetHolder
EOA-->|claimAll|ETHAssetHolder
EOA-->|transferAll|ETHAssetHolder
EOA-->|deposit|ERC20AssetHolder
EOA-->|claimAll|ERC20AssetHolder
EOA-->|transferAll|ERC20AssetHolder
A-->|setOutcome| ETHAssetHolder
A-->|setOutcome| ERC20AssetHolder
Token
EOA-->|approve|Token
ERC20AssetHolder-->|transfer| Token
ERC20AssetHolder-->|transferFrom| Token
classDef Contract fill:#ffffff;
class A,ERC20AssetHolder,ETHAssetHolder,Token Contract;
click A "https://github.com/statechannels/nitro-protocol/blob/master/contracts/NitroAdjudicator.sol"
click ETHAssetHolder "https://github.com/statechannels/nitro-protocol/blob/master/contracts/ETHAssetHolder.sol"
click ERC20AssetHolder "https://github.com/statechannels/nitro-protocol/blob/master/contracts/ERC20AssetHolder.sol"
click Token "https://github.com/statechannels/nitro-protocol/blob/master/contracts/Token.sol"
</div>

A typical execution of a Nitro state channel is for participants to :

1. Each `deposit` into an Asset Holder,
2. Exchange state updates without interacting with any contract (i.e. to execute 'off-chain'),
3. Finalize the outcome of the channel using `conclude`,
4. Use `pushOutcome` to update the Asset Holder contract via the Adjudicator,
5. Use `transferAll` to extract assets from the Asset Holder.
