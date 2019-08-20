# De-Funding Protocol

This protocol handles de-funding a channel. It includes:

- Checking to see that a channel is finalized (either concluded or finalized on chain)
- If a direct channel, initiates the withdrawal protocol.
- Monitoring the blockchain for a response or timeout.

## State machine

The protocol is implemented with the following state machine

```mermaid
graph TD
linkStyle default interpolate basis
  S((start))-->ICC{Is Channel Closed}
  ICC-->|No|F((failure))
  ICC-->|Yes|ID{Get Funding Type}
  ID-->|Directly Funded|F((Failure))
  ID -->|Ledger Funding|LDP(Wait for Indirect De-funding)
  ID -->|Virtual Funding|VD(Wait for Virtual De-funding)
  VD -->|Virtual Defunding Action|VD
  VD -->|Virtual Defunding Success|Su((success))
  LDP-->|Indirect de-funding protocol success|Su((Success))
  LDP-->|Indirect de-funding protocol failure|F

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S,ICC,ID logic;
  class Su Success;
  class F Failure;
  class WP,LDP,VD WaitForChildProtocol;
```

## Notes

- Withdrawal Complete/Failure and Indirect de-funding Complete/Failure are not actions. They are checks on the sub-protocol state to see if success/failure has been reached.
