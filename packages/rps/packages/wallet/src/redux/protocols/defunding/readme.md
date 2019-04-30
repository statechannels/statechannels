# De-Funding Protocol

This protocol handles de-funding a channel. It includes:

- Checking to see that a channel is finalized (either concluded or finalized on chain)
- If a direct channel, initiates the withdrawal protocol.
- Monitoring the blockchain for a response or timeout.

## State machine

The protocol is implemented with the following state machine

```mermaid
graph TD
  S((start))-->ICC{Is Channel Closed}
  ICC-->|No|F((failure))
  ICC-->|Yes|ID{Is Direct Channel}
  ID-->|Yes|WP(Wait for Withdrawal)
  ID -->|No|LDP(Wait for Ledger De-funding)
  WP-->|Withdrawal protocol success|Su((success))
  LDP-->|Ledger de-funding protocol success|Su((success))
  WP-->|Withdrawal protocol failure|F((failure))
  LDP-->|Ledger de-funding protocol failure|F((failure))

  style S  fill:#efdd20
  style ICC  fill:#efdd20
  style ID fill:#efdd20
  style Su fill:#58ef21
  style F  fill:#f45941
  style WP stroke:#333,stroke-width:4px
  style LDP stroke:#333,stroke-width:4px
```

Key:

```mermaid
  graph TD
  St((Start))-->L
  L{Flow Logic} --> NT1(Non-Terminal States)
  NT1 -->|ACTION| C
  C(Call child reducer) -->|child return status| NT2
  NT2(More Non-Terminal States) --> |SUCCESS_TRIGGER| Su
  Su((Success))
  NT2(More Non-Terminal States) --> |FAILURE_TRIGGER| F
  F((Failure))

  style St  fill:#efdd20
  style L fill:#efdd20
  style C stroke:#333,stroke-width:4px
  style Su fill:#58ef21
  style F  fill:#f45941
```

## Notes

- Withdrawal Complete/Failure and Ledger de-funding Complete/Failure are not actions. They are checks on the sub-protocol state to see if success/failure has been reached.

## Scenarios

1. **Directly Funded Channel Happy Path** - Start -> Is Channel Closed -> Yes-> Is Direct Channel -> Yes -> Wait for Withdrawal->Withdrawal Protocol Complete -> Success
2. **Ledger Funded Channel Happy Path** - Start -> Is Channel Closed -> Yes-> Is Direct Channel -> No -> Wait for Ledger de-funding -> Ledger de-funding Protocol Complete -> Success
3. **Channel Not Closed** - Start -> Is Channel Closed -> No -> Failure
4. **Withdrawal Failure** - Start -> Is Channel Closed -> Yes -> Is Direct Channel -> Yes -> Wait for Withdrawal-> Withdrawal Protocol Failure -> Failure
5. **Ledger de-funding Failure** - Start -> Is Channel Closed -> Yes-> Is Direct Channel -> No ->Wait for Ledger de-funding->Ledger de-funding Protocol Failure -> Failure
