# Indirect Funding Protocol for Player A

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
    style St  fill:#efdd20
    style S fill:#58ef21
    style F  fill:#f45941
    style WFDF stroke:#333,stroke-width:4px
```

### Scenarios

We will use the following two scenarios in tests:

1. **Happy path**: `WaitForPreFundL1` -> `WaitForDirectFunding` -> `WaitForLedgerUpdate1` -> `WaitForPostFund1` -> `Success`
2. **Ledger funding fails**: `WaitForDirectFunding` -> `Failure`
