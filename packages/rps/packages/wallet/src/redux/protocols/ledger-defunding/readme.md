# Indirect De-Funding Protocol

The purpose of this protocol is handle de-funding a channel that has been indirectly funded.

The protocol exchanges updates to allocate funds back to the player.

The protocol assumes the application channel is closed and a new ledger consensus does need to be reached.

It covers updating consensus (using ConsensusUpdate sub-protocol) on the ledger channel to reflect the app channel balance.

## State machine

```mermaid
graph TD
linkStyle default interpolate basis
  St((start))-->WFU(WaitForLedgerUpdate)
  WFU-->|ConsensusUpdateAction|WFU
  WFU-->|ConsensusUpdateSuccess|WFC(WaitForConclude)


  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef NotAState stroke:#333,stroke-width:4px,color:#ffff,fill:#aaaaaa;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;

  class St,DF logic;
  class Su Success;
  class F Failure;
  class SC0,SCo0 NotAState;
  class WFU,WFC WaitForChildProtocol;
```
