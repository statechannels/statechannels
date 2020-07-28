---
id: version-0.1.1-contract-inheritance
title: Contract Inheritance
original_id: contract-inheritance
---

The following diagram shows how the contracts inherit from one another. Click on a node to see the corresponding API.

<div class="mermaid" align="center">
graph LR
linkStyle default interpolate basis
AssetHolder
Adjudicator
ConsensusApp
CountingApp
ERC20
ERC20AssetHolder
ETHAssetHolder
ForceMove
ForceMoveApp
IAssetHolder
IERC20
IForceMove
NitroAdjudicator
Outcome
SafeMath
SingleAssetPayments
TESTAssetHolder
TESTForceMove
TESTNitroAdjudicator
Token
TrivialApp
IForceMove--> ForceMove
Adjudicator--> NitroAdjudicator
ForceMove--> NitroAdjudicator
IAssetHolder--> AssetHolder
AssetHolder-->ETHAssetHolder
AssetHolder-->ERC20AssetHolder
ForceMove-->TESTForceMove
NitroAdjudicator--> TESTNitroAdjudicator
AssetHolder-->TESTAssetHolder
ForceMoveApp-->CountingApp
ForceMoveApp-->TrivialApp
ForceMoveApp-->SingleAssetPayments
ForceMoveApp-->ConsensusApp
IERC20-->ERC20
ERC20-->Token
classDef Contract fill:#ffffff;
classDef DeployedContract fill:#ffffff,stroke:#000000,stroke-width:4px;
classDef Abstract fill:#afe523;
classDef Interface fill:#bfa129;
classDef TestContract fill:#fafe4f;
classDef Library fill:#bbbb;
class Outcome,SafeMath Library;
class IForceMove Abstract;
class Adjudicator,IAssetHolder,ForceMoveApp,IERC20 Interface;
class ForceMove,AssetHolder,ETHAssetHolder,ERC20AssetHolder,SingleAssetPayments,TrivialApp,CountingApp,ERC20,ConsensusApp Contract;
class TESTForceMove,TESTNitroAdjudicator,TESTAssetHolder,Token TestContract;
class NitroAdjudicator,ETHAssetHolder,ERC20AssetHolder,ConsensusApp DeployedContract;
click Adjudicator "./natspec/Adjudicator";
click AssetHolder "./natspec/AssetHolder";
click ConsensusApp "./natspec/ConsensusApp";
click CountingApp "./natspec/CountingApp";
click ERC20 "./natspec/ERC20";
click ERC20AssetHolder "./natspec/ERC20AssetHolder";
click ETHAssetHolder "./natspec/ETHAssetHolder";
click ForceMove "./natspec/ForceMove";
click ForceMoveApp "./natspec/ForceMoveApp";
click IAssetHolder "./natspec/IAssetHolder";
click IERC20 "./natspec/IERC20";
click IForceMove "./natspec/IForceMove";
click NitroAdjudicator "./natspec/NitroAdjudicator";
click Outcome "./natspec/Outcome";
click SafeMath "./natspec/SafeMath";
click SingleAssetPayments "./natspec/SingleAssetPayments";
click TESTAssetHolder "./natspec/TESTAssetHolder";
click TESTForceMove "./natspec/TESTForceMove";
click TESTNitroAdjudicator "./natspec/TESTNitroAdjudicator";
click Token "./natspec/Token";
click TrivialApp "./natspec/TrivialApp";
</div>

---

Key:

<div class="mermaid" align="center">
graph LR
linkStyle default interpolate basis
Abstraction-->|Inherited by| Contract
Contract-->|Inherited by| TestContract
Interface-->|Inherited by| Contract
Library
DeployedContract
classDef Contract fill:#ffffff;
classDef Abstraction fill:#afe523;
classDef TestContract fill:#fafe4f;
classDef Interface fill:#bfa129;
classDef Library fill:#bbbb;
classDef DeployedContract fill:#ffffff,stroke:#000000,stroke-width:4px;
class Library Library;
class Abstraction Abstraction;
class Contract Contract;
class TestContract TestContract;
class Interface Interface;
class DeployedContract DeployedContract
</div>
