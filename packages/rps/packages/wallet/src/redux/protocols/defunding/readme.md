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
  ICC-->|Yes|ID{Is Direct Channel}
  ID-->|Yes|WP(Wait for Withdrawal)
  ID -->|No|LDP(Wait for Indirect De-funding)
  LDP-->|Indirect de-funding protocol success|WP(Wait for Withdrawal)
  WP-->|Withdrawal protocol success|Su((Success))
  WP-->|Withdrawal protocol failure|F((Failure))
  LDP-->|Indirect de-funding protocol failure|F

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S,ICC,ID logic;
  class Su Success;
  class F Failure;
  class WP,LDP WaitForChildProtocol;
```

## Notes

- Withdrawal Complete/Failure and Indirect de-funding Complete/Failure are not actions. They are checks on the sub-protocol state to see if success/failure has been reached.

## Scenarios

1. **Directly Funded Channel Happy Path** - Start -> Is Channel Closed -> Yes-> Is Direct Channel -> Yes -> Wait for Withdrawal->Withdrawal Protocol Complete -> Success
2. **Indirect Funded Channel Happy Path** - Start -> Is Channel Closed -> Yes-> Is Direct Channel -> No -> Wait for Indirect de-funding -> Indirect de-funding Protocol Complete -> Wait for Withdrawal->Withdrawal Protocol Complete -> Success
3. **Channel Not Closed** - Start -> Is Channel Closed -> No -> Failure
4. **Withdrawal Failure** - Start -> Is Channel Closed -> Yes -> Is Direct Channel -> Yes -> Wait for Withdrawal-> Withdrawal Protocol Failure -> Failure
5. TODO: **Indirect de-funding Failure** - Start -> Is Channel Closed -> Yes-> Is Direct Channel -> No ->Wait for Indirect de-funding->Indirect de-funding Protocol Failure -> Failure
