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
  style St  fill:#efdd20
  style S fill:#58ef21
  style F  fill:#f45941
  style WFDF stroke:#333,stroke-width:4px
```

### Scenarios

We will use the following two scenarios in tests:

1. **Happy path**: `WaitForPreFundL0` -> `WaitForDirectFunding` -> `WaitForLedgerUpdate0` -> `WaitForPostFund0` -> `Success`
2. **Ledger funding fails**: `WaitForDirectFunding` -> `Failure`
