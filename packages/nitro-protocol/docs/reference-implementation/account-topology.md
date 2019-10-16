---
id: account-topology
title: Account Topology
---

The below diagram show various transactions connect externally owned accounts; and adjudicator, asset-holder and token contract accounts deployed to the Ethereum blockchain. Clicking on the contract account will take you to the documentation for that contract.

<div class="mermaid" align="center">
graph LR
linkStyle default interpolate basis
A["Adjudicator"]
EOA["EOA"]
EOA-->|forceMove|A
EOA-->|respond|A
EOA-->|checkpoint|A
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
click A "https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/NitroAdjudicator.sol"
click ETHAssetHolder "https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/ETHAssetHolder.sol"
click ERC20AssetHolder "https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/ERC20AssetHolder.sol"
click Token "https://github.com/statechannels/monorepo/tree/master/packages/nitro-protocol/contracts/Token.sol"
</div>

A typical execution of a Nitro state channel is for participants to:

1. Each `deposit` into an Asset Holder,
2. Exchange state updates without interacting with any contract (i.e. to execute 'off-chain'),
3. Finalize the outcome of the channel using `conclude`,
4. Use `pushOutcome` to update the Asset Holder contract via the Adjudicator,
5. Use `transferAll` to extract assets from the Asset Holder.
