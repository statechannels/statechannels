# New Ledger Funding

The new ledger funding protocol coordinates the process of funding an application channel, X, via a ledger channel, L.

- Opening + funding the ledger channel
- Updating the ledger channel to fund the the application channel

Out of scope (for now):

- Handling the case where an opponent stalls mid-protocol

## The Protocol

The protocol interacts between client wallets through the following messages:

```mermaid
sequenceDiagram
  participant A as A's wallet
  participant B as B's wallet

  Note  over A, B: Open L
  A->>B: PreFund0 for L
  B->>A: Prefund1 for L
  Note  over A, B: Directly fund L (sub-protocol)
  Note  over A, B: Fund X with L
  A->>B: Update L to fund X (0)
  B->>A: Update L to fund X (1)
  Note  over A, B: Postfund for X
  A->>B: PostFund0 for X
  B->>A: PostFund1 for X
```

### State Machine

```mermaid
  graph TD
  linkStyle default interpolate basis
    St((start)) --> WFPrF1(WaitForPreFundL1)
    WFPrF1 -->|ReceiveCommitment| WFDF(WaitForDirectFunding)
    WFDF -->|FundingAction| WFDF
    WFDF -->|Success| WFPoF1(WaitForPostFundSetup1)
    WFDF -->|Failure| F((Failure))
    WFPoF1 --> |AdvanceChannelAction| WFPoF1(WaitForPostFundSetup1)
    WFPoF1 --> |AdvanceChannelSuccess|WFL1(WaitForLedgerUpdate1)
    WFL1 --> |ConsensusUpdateAction|WFL1
    WFL1 --> |ConsensusUpdateSuccess| S((sucess))
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class St logic;
  class S Success;
  class F Failure;
  class WFDF,WFPoF1,WFL1 WaitForChildProtocol;

```

### Scenarios

We will use the following two scenarios in tests:

1. **Happy path**: `WaitForPreFundL1` -> `WaitForDirectFunding` -> `WaitForLedgerUpdate1` -> `WaitForPostFund1` -> `Success`
2. **Ledger funding fails**: `WaitForDirectFunding` -> `Failure`
