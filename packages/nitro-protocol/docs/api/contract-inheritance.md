---
id: contract-inheritance
title: Contract Inheritance
---

The following diagram shows how the contracts inherit from one another.
<div class="mermaid" align="center">
 classDiagram
    class Adjudicator{
        +pushOutcome()
    }
    class AssetHolder{
        -AdjudicatorAddress
        +holdings
        +outcomeHashes
        +transferAll()
        +claimAll()
        #setAssetOutcomeHash()
        -_transferAsset()
    }
    class ConsensusApp{
        -identical()
        -appData()
        +validTransition()
    }
    class CountingApp{
        -appData()
        +validTransition()
    }
    class ERC20{
    }
    class ERC20AssetHolder{
    }
    class ETHAssetHolder{
    }
    class ForceMove{
    }
    class ForceMoveApp{
    }
    class IAssetHolder{
    }
    class IERC20{
    }
    class IForceMove{
    }
    class NitroAdjudicator{
    }
    class Outcome{
    }
    class SafeMath{
    }
    class SingleAssetPayments{
    }
    class TESTAssetHolder{
    }
    class TESTForceMove{
    }
    class TESTNitroAdjudicator{
    }
    class Token{
    }
    class TrivialApp{
    }
    IForceMove--|> ForceMove
    Adjudicator--|> NitroAdjudicator
    ForceMove--|> NitroAdjudicator
    IAssetHolder--|> AssetHolder
    AssetHolder--|>ETHAssetHolder
    AssetHolder--|>ERC20AssetHolder
    ForceMove--|>TESTForceMove
    NitroAdjudicator--|> TESTNitroAdjudicator
    AssetHolder--|>TESTAssetHolder
    ForceMoveApp--|>CountingApp
    ForceMoveApp--|>TrivialApp
    ForceMoveApp--|>SingleAssetPayments
    ForceMoveApp--|>ConsensusApp
    IERC20-->ERC20
    ERC20-->Token
</div>
