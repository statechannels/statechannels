# Funding Protocol

The purpose of this protocol is to

1. Determine the funding strategy by initiating the funding strategy negotiation protocol
2. Initialize the protocol for the corresponding strategy
3. Route further actions to that strategy's protocol

It should be triggered by the `FUNDING_REQUESTED` event from the app.
On success, it should send `FUNDING_SUCCESS` to the app.

Out of scope (for now):

- Supporting protocols other than indirect funding
- Recovering from a partially successful process

## State machine

The protocol is implemented with the following state machine

```mermaid
graph TD
linkStyle default interpolate basis
  S((start)) --> WFSN(WaitForStrategyNegotiation)

  WFSN --> |StrategyNegotiationAction| WFSN
  WFSN -->|Failure|F((failure))
  WFSN --> |VirtualStrategySelected| WFVF(WaitForVirtualFunding)
   WFSN --> |IndirectStrategySelected| WFIF(WaitForIndirectFunding)
  WFVF --> |VirtualFundingAction|WFVF
  WFVF -->|Success|WFPS(WaitForPostFundSetup)
  WFVF -->|Failure|F((failure))
  WFIF --> |IndirectFundingAction|WFIF
  WFIF -->|Success|WFPS(WaitForPostFundSetup)
  WFIF -->|Failure|F((failure))
  WFPS -->|AdvanceChannelAction|WFPS
  WFPS-->|Success|SS((success))


  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S logic;
  class SS Success;
  class F Failure;
  class WFVF,WFIF,WFSN,WFPS WaitForChildProtocol;
```
