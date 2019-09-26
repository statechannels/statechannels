# New Ledger Channel

The new ledger channel protocol coordinates the process of opening + funding a new ledger channel.

Out of scope (for now):

- Handling the case where an opponent stalls mid-protocol

## The Protocol

The protocol interacts between client wallets through the following messages:

```mermaid
sequenceDiagram
  participant A as A's wallet
  participant B as B's wallet

  Note  over A, B: Open L (sub-protocol)
  Note  over A, B: Directly fund L (sub-protocol)
  Note  over A, B: Exchange post-fund setup for L (sub-protocol)
```

### State Machine

```mermaid
  graph TD
  linkStyle default interpolate basis
    St((start)) --> WFPrF1(WaitForPreFundL1)
    WFPrF1 -->|AdvanceChannelAction| WFDF(WaitForDirectFunding)
    WFPrF1 --> |AdvanceChannelAction| WFPrF1
    WFDF -->|FundingAction| WFDF
    WFDF -->|Success| WFPoF1(WaitForPostFundSetup1)
    WFPoF1 --> |AdvanceChannelAction| WFPoF1(WaitForPostFundSetup1)
    WFPoF1 --> |AdvanceChannelSuccess|S(Success)
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class St logic;
  class S Success;
  class WFDF,WFPoF1,WFPrF1 WaitForChildProtocol;
```
