# Ledger Top Up Protocol

The purpose of the protocol is to top up an existing ledger channel so that it can be used to fund a game.

## State machine

```mermaid
graph TD
  linkStyle default interpolate basis
  St((Start))-->WFLU1(WaitForPreTopUpLedgerUpdate)
  WFLU1-->|"CommitmentReceived(Accept)"|WFDF(WaitForDirectFunding)
  WFDF-->|FundingAction|WFDF(WaitForDirectFunding)
  WFDF-->|Success|WFLU2(WaitForPostTopUpLedgerUpdate)
  WFLU1-->|"CommitmentReceived(Reject)"|F((failure))
WFLU2-->|"CommitmentReceived(Accept)"|Su((success))
WFLU2-->|"CommitmentReceived(Reject)"|F((failure))

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class St,NT logic;
  class Su Success;
  class F Failure;
  class LT WaitForChildProtocol;
```

## Scenarios

1. **Player A Happy Path** Start->WaitForPreTopUpLedgerUpdate->WaitForDirectFunding->WaitForPostTopUpLedgerUpdate->Success
2. **Player B Happy Path** Start->WaitForPreTopUpLedgerUpdate->WaitForDirectFunding->WaitForPostTopUpLedgerUpdate->Success
3. **Pre-TopUp Invalid Update** WaitForPreTopUpLedgerUpdate->Failure
4. **Post-TopUp Invalid Update** WaitForPostTopUpLedgerUpdate->Failure

TODO: Should we have a scenario for cases where only one player needs to top up?
