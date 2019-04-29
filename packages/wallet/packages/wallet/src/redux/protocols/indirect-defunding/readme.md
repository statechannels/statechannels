# Indirect De-Funding Protocol

The purpose of this protocol is handle de-funding a channel that has been indirectly funded.

It covers:

- Checking that a channel is closed (either finalized on chain or a conclusion proof exists)
- Crafting a ledger update that allocates the funds to the players.
- Waiting for a ledger response from the opponent.

## State machine

### Player A State machine

```mermaid
graph TD
  St((start))-->DF{Defundable?}
  DF --> |No| F((Failure))
  DF -->|Yes|SC0[SendLedgerUpdate0]
  SC0-->WFU(WaitForLedgerUpdate)
  WFU --> |"CommitmentReceived(Accept)"|SC1[SendLedgerUpdate2]
  SC1-->S((success))
  WFU --> |"CommitmentReceived(Reject)"| F
```

### Player B State machine

```mermaid
graph TD
  St((start))-->DF{Defundable?}
  DF --> |No| F((Failure))
  DF --> |Yes| WFU(WaitForLedgerUpdate)
  WFU-->|"CommitmentReceived(Accept)"|SC1[SendLedgerUpdate1]
  WFU --> |"CommitmentReceived(Reject)"| F
  SC1-->WFFU(WaitForFinalLedgerUpdate)
  WFFU-->|"CommitmentReceived(Accept)"|S((success))
  WFFU-->|"CommitmentReceived(Reject)"|F

```

Notes:

- SendLedgerUpdate0/1 are not states but indicate when the ledger update is sent.
- A single reducer implements both the player A and B state machine.

Assumptions:

- It is Player A's turn to make the next ledger update.

## Scenarios

1. **Happy Path - Player A** Start->WaitForLedgerUpdate->Success
2. **Happy Path - Player B** Start->WaitForLedgerUpdate->WaitForFinalLedgerUpdate->Success
3. **Not De-fundable** Start->Failure
4. **Commitment Rejected - Player A** Start->WaitForLedgerUpdate->Failure
5. **First Commitment Rejected - Player B** Start->WaitForLedgerUpdate->Failure
6. **Final Commitment Rejected - Player B** Start->WaitForLedgerUpdate->WaitForFinalLedgerUpdate->Failure
