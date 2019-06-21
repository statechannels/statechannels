# Consensus Update Protocol

The purpose of the protocol is to handle updating the allocation and destination of channels running the consensus app.

## State Machine

```mermaid
graph TD
linkStyle default interpolate basis
  S((Start)) --> WFU(WaitForUpdate)
  WFU-->|"Commitment Received(Accept)"|SS((success))
  WFU-->|"Commitment Received(Reject)"|F((failure))
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S,E,MT logic;
  class SS Success;
  class F Failure;
  class D WaitForChildProtocol;
```

## Scenarios

1. **Player A Happy Path** Start->WaitForUpdate->Success
2. **Player B Happy Path** Start->WaitForUpdate->Success
3. **Player A Commitment Rejected** WaitForUpdate->Failure
4. **Player B Commitment Rejected** WaitForUpdate->Failure
