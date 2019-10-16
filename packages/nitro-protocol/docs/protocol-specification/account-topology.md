---
id: account-topology
title: Account Topology
---


The below diagram show various transactions connect externally owned accounts; and adjudicator and asset-holder contract accounts deployed to the Ethereum blockchain. Clicking on the contract account will take you to the interface for that contract.

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
EOA-->|deposit|AssetHolder
EOA-->|claimAll|AssetHolder
EOA-->|transferAll|AssetHolder
A-->|setOutcome|AssetHolder
classDef Contract fill:#ffffff;
class A,AssetHolder Contract;
click A "../interfaces/Adjudicator"
click AssetHolder "../interfaces/IAssetHolder"
</div>

A typical execution of a Nitro state channel is for participants to:

1. Each `deposit` into an Asset Holder,
2. Exchange state updates without interacting with any contract (i.e. to execute 'off-chain'),
3. Finalize the outcome of the channel using `conclude`,
4. Use `pushOutcome` to update the Asset Holder contract via the Adjudicator,
5. Use `transferAll` to extract assets from the Asset Holder.
