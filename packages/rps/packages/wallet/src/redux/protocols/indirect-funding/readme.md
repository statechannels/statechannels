# Indirect Funding Protocol

The purpose of this protocol is to indirectly fund a channel using a ledger channel. This protocol initiates the `NewLedgerChannel` protocol when needed, and proceeds with the `ExistingLedgerFundingProtocol`.

# State machine

```mermaid
  graph TD
  linkStyle default interpolate basis
  St((Start))-->L
  L-->|No|WFNLC(WaitForNewLedgerChannel)
  WFNLC-->|LedgerChannelOpened|WFLF[WaitForLedgerFunding]
  L{Does ledger channel exist?}-->|Yes|WFLF[WaitForLedgerFunding]
  WFNLC-->|Failure|F
  WFNLC-->|NewLedgerChannelAction|WFNLC
  WFLF-->|Failure|F((failure))
  WFLF-->|Success|Su((success))
  WFLF-->|ExistingLedgerChannelAction|WFLF
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  classDef NotAState stroke:#333,stroke-width:4px,fill:#0000;
  class St,L logic;
  class Su Success;
  class F Failure;
  class WFNLC,WFLF WaitForChildProtocol;
  class SC0,SP0 NotAState
```

## Scenarios

1. **Existing Ledger Funding Happy Path**
   - Start
   - WaitForExistingLedgerFunding
2. **New Ledger Funding Happy Path**
   - Start
   - WaitForNewLedgerChannel
   - WaitForExistingLedgerFunding
   - Success
