The following diagram shows how the contracts inherit from one another.

```mermaid
graph LR
linkStyle default interpolate basis

Adjudicator
AssetHolder
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
classDef Abstract fill:#afe523;
classDef Interface fill:#bfa129;
classDef TestContract fill:#fafe4f;
classDef Library fill:#bbbb;
class Outcome,SafeMath Library;
class Adjudicator,IAssetHolder,ForceMoveApp,IERC20,IForceMove Interface;
class NitroAdjudicator,ForceMove,AssetHolder,ETHAssetHolder,ERC20AssetHolder,SingleAssetPayments,TrivialApp,CountingApp,ERC20,Token,ConsensusApp Contract;
class TESTForceMove,TESTNitroAdjudicator,TESTAssetHolder TestContract;
```

key:

```mermaid
graph LR
linkStyle default interpolate basis
Contract-->|Inherited by| TestContract
Interface-->|Inherited by| Contract
Library
classDef Contract fill:#ffffff;
classDef Abstraction fill:#afe523;
classDef TestContract fill:#fafe4f;
classDef Interface fill:#bfa129;
classDef Library fill:#bbbb;
class Library Library;
class Abstraction Abstraction;
class Contract Contract;
class TestContract TestContract;
class Interface Interface;
```
