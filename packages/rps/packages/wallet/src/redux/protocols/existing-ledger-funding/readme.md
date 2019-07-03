# Existing Ledger Funding Protocol

The purpose of this protocol is to fund a channel using an existing ledger channel. The protocol should

- Check if a ledger channel has enough funds to fund the requested channel.
  - If not it should initiate a ledger top-up protocol.
- Craft ledger updates to fund the channel. (Perhaps we should extract this into a protocol that can be shared by indirect-funding and Existing Ledgerfunding.)

Currently we assume a Ledger Top-up protocol handles both the cases where a current player needs to top-up funds and the case where their opponent needs to top-up.

# State Machine

### Player A State Machine

```mermaid
  graph TD
  linkStyle default interpolate basis
  St((Start))-->L
  L{Does Player channel have enough funds?}-->|No|LT(WaitForLedgerTopup)
  L{Does Existing channel has enough funds?}-->|Yes|SC0[SendLedgerUpdate0]
  LT-->|LedgerChannelToppedUp|SC0[SendLedgerUpdate0]
  SC0-->WC(WaitForLedgerUpdate)
  WC-->|"CommitmentReceived(Reject)"|F((failure))
  WC-->|"CommitmentReceived(Accept)"|SP0[SendPostFundSetup1]
  SP0-->WP(WaitForPostFundSetup)
  WP-->|"CommitmentReceived(Reject)"|F((failure))
  WP-->|"CommitmentReceived(Accept)"|Su((success))
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  classDef NotAState stroke:#333,stroke-width:4px,fill:#0000;
  class St,L logic;
  class Su Success;
  class F Failure;
  class LT WaitForChildProtocol;
  class SC0,SP0 NotAState
```

### Player B State Machine

```mermaid
  graph TD
  linkStyle default interpolate basis
  St((Start))-->L
  L{Does Existing Ledgerhave enough funds?}-->|No|LT(WaitForLedgerTopup)
  L{Does Existing Ledgerhave enough funds?}-->|Yes|WC(WaitForLedgerUpdate)
  LT-->|LedgerChannelToppedUp|WC(WaitForLedgerUpdate)
  WC-->|"CommitmentReceived(Accept)"|SC1[SendLedgerUpdate1]
  SC1-->WP(WaitForPostFundSetup)
  WP-->|"CommitmentReceived(Accept)"|SP1[SendPostFundSetup1]
  SP1-->Su((success))
  WC-->|"CommitmentReceived(Reject)"|F((failure))
  WP-->|"CommitmentReceived(Reject)"|F((failure))
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  classDef NotAState stroke:#333,stroke-width:4px,fill:#0000;
  class St,L logic;
  class Su Success;
  class F Failure;
  class LT WaitForChildProtocol;
  class SC1,SP1 NotAState
```

### Scenarios:

1. **Player A has funds Happy Path** Start->WaitForLedgerUpdate->WaitForPostFundSetup->Success
2. **Player B has funds Happy Path** Start->WaitForLedgerUpdate->WaitForPostFundSetup->Success
3. **Player A receives invalid update commitment** WaitForLedgerUpdate->Failure
4. **Player B receives invalid update commitment** WaitForLedgerUpdate->Failure
5. **Player A receives invalid post fund commitment** WaitForPostFundSetup->Failure
6. **Player B receives invalid post fund commitment** WaitForPostFundSetup->Failure
   These scenarios depend on Ledger Top-Up:

7. **Player A requires top-up** Start->WaitForLedgerTopUp->WaitForLedgerUpdate->Success
8. **Player requires top-up** Start->WaitForLedgerTopUp->WaitForLedgerUpdate->Success
