# Indirect De-Funding Protocol

The purpose of this protocol is handle de-funding a channel that has been indirectly funded.

The protocol exchanges updates to allocate funds back to the player and conclude commitments to close the channel.

It covers:

- Checking that a channel is closed (either finalized on chain or a conclusion proof exists)
- Crafting a ledger update that allocates the funds to the players.
- Waiting for a ledger response from the opponent.
- Crafting a conclude commitment to close the ledger channel.

## State machine

### Player A State machine

```mermaid
graph TD
linkStyle default interpolate basis
  St((start))-->DF{Defundable?}
  DF --> |No| F((Failure))
  DF -->|Yes|SC0[SendLedgerUpdate0]
  SC0-->WFU(WaitForLedgerUpdate)
  WFU --> |"CommitmentReceived(Accept)"|SCo0[SendConclude0]
  WFU --> |"CommitmentReceived(Reject)"| F
  SCo0 -->WFC(WaitForConclude)
  WFC --> |"CommitmentReceived(Accept)"|Su((success))
  WFC --> |"CommitmentReceived(Reject)"| F

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef NotAState stroke:#333,stroke-width:4px,color:#ffff,fill:#aaaaaa;
  class St,DF logic;
  class Su Success;
  class F Failure;
  class SC0,SCo0 NotAState
```

### Player B State machine

```mermaid
graph TD
linkStyle default interpolate basis
  St((start))-->DF{Defundable?}
  DF --> |No| F((Failure))
  DF --> |Yes| WFU(WaitForLedgerUpdate)
  WFU-->|"CommitmentReceived(Accept)"|SC1[SendLedgerUpdate1]
  WFU --> |"CommitmentReceived(Reject)"| F
  SC1-->WFC(WaitForConclude)
  WFC --> |"CommitmentReceived(Accept)"|SCo1[SendConclude1]
  SCo1-->Su((success))
  WFC --> |"CommitmentReceived(Reject)"| F

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef NotAState stroke:#333,stroke-width:4px,color:#ffff,fill:#aaaaaa;
  class St,DF logic;
  class Su Success;
  class F Failure;
  class SC1,SCo1 NotAState

```

Notes:

- SendLedgerUpdate is not a state but indicate when the ledger update is sent.
- A single reducer implements both the player A and B state machine.

## Scenarios

1. **Happy Path - Player A** Start->SendLedgerUpdate->WaitForLedgerUpdate->Success
2. **Happy Path - Player B** Start->WaitForLedgerUpdate->SendLedgerUpdate->Success
3. **Not De-fundable** Start->Failure
4. **Commitment Rejected - Player A** Start->SendLedgerUpdate->WaitForLedgerUpdate->Failure
5. **Commitment Rejected - Player B** Start->WaitForLedgerUpdate->Failure
