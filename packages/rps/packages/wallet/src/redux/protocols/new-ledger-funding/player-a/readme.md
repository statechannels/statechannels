# New Ledger Funding Protocol for Player A

### State Machine

```mermaid
  graph TD
  linkStyle default interpolate basis
    St((start)) --> WFPrF1(WaitForPreFundL1)
    WFPrF1 -->|ReceiveCommitment| WFDF(WaitForDirectFunding)
    WFDF -->|FundingAction| WFDF
    WFDF -->|Success| WFLU1(WaitForLedgerUpdate1)
    WFDF -->|Failure| F((Failure))
    WFLU1 --> |ReceiveCommitment| WFPoF1(WaitForPostFundSetup1)
    WFPoF1 --> |ReceiveCommitment| S((Success))
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class St logic;
  class S Success;
  class F Failure;
  class WFDF WaitForChildProtocol;

```

### Scenarios

We will use the following two scenarios in tests:

1. **Happy path**: `WaitForPreFundL1` -> `WaitForDirectFunding` -> `WaitForLedgerUpdate1` -> `WaitForPostFund1` -> `Success`
2. **Ledger funding fails**: `WaitForDirectFunding` -> `Failure`
