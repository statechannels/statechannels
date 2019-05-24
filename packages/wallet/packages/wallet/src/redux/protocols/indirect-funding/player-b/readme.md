# Indirect Funding Protocol for Player B

### State Machine

```mermaid
  graph TD
  linkStyle default interpolate basis
    St((Start)) --> WFPrF0
    WFPrF0(BWaitForPreFundSetup0) -->|CommitmentReceived| WFDF(BWaitForDirectFunding)
    WFDF -->|FundingAction| WFDF
    WFDF -->|Success| WFLU0(BWaitForLedgerUpdate0)
    WFDF -->|Failure| F((Failure))
    WFLU0 --> |CommitmentReceived| WFPoF0(BWaitForPostFundSetup0)
    WFPoF0 --> |CommitmentReceived| S((Success))
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

1. **Happy path**: `WaitForPreFundL0` -> `WaitForDirectFunding` -> `WaitForLedgerUpdate0` -> `WaitForPostFund0` -> `Success`
2. **Ledger funding fails**: `WaitForDirectFunding` -> `Failure`
