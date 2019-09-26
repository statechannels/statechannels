The following diagram shows how the contracts inherit from one another.

```mermaid
graph LR
linkStyle default interpolate basis
IForceMove--> ForceMove
Adjudicator--> NitroAdjudicator
ForceMove--> NitroAdjudicator
IAssetHolder--> AssetHolder
AssetHolder-->ETHAssetHolder
AssetHolder-->ERC20AssetHolder

ForceMove-->TESTForceMove
NitroAdjudicator--> TESTNitroAdjudicator

AssetHolder-->TESTAssetHOlder

classDef Contract fill:#ffffff;
classDef Abstract fill:#afe523;
classDef Interface fill:#bfa129;
classDef TestContract fill:#fafe4f;
class IForceMove,IAssetHolder Abstract;
class Adjudicator Interface;
class NitroAdjudicator,ForceMove,AssetHolder,ETHAssetHolder,ERC20AssetHolder Contract;
class TESTForceMove,TESTNitroAdjudicator,TESTAssetHOlder TestContract;
```

key:

```mermaid
graph LR
linkStyle default interpolate basis
Abstraction-->|Inherited by| Contract
Contract-->|Inherited by| TestContract
Interface-->|Inherited by| Contract
classDef Contract fill:#ffffff;
classDef Abstraction fill:#afe523;
classDef TestContract fill:#fafe4f;
classDef Interface fill:#bfa129;
class Abstraction Abstraction;
class Contract Contract;
class TestContract TestContract;
class Interface Interface;
```
