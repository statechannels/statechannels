# Concluding Protocol (Instigator)

The purpose of this protocol is to instigate conclusion (or finalization) of a channel, i.e. to send a conclude commitment.
It covers:

- Checking to see if it is the player's turn and explaining they can't resign if not
- Asking user to confirm the resignation (probably displaying the current outcome)
- Formulating the conclude state and sending to the opponent
- Waiting for a conclude from the opponent
- Acknowledge channel concluded (giving the option to defund)

Out of scope (for the time being):

- Giving the option to launch a challenge if the conclude doesn't arrive

## State machine

The protocol is implemented with the following state machine

```mermaid
graph TD
linkStyle default interpolate basis
  S((Start)) --> E{Channel Exists?}
  E --> |No| AF(InstigatorAcknowledgeFailure)
  AF -->|WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED| F((Failure))
  E --> |Yes| MT{My turn?}
  MT  --> |Yes| CC(InstigatorApproveConcluding)
  MT  --> |No| AF(InstigatorAcknowledgeFailure)
  CC  --> |WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED| F
  CC  --> |WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED| WOC(InstigatorWaitForOpponentConclude)
  WOC --> |CONCLUDE.RECEIVED| ACR(InstigatorAcknowledgeConcludeReceived)
  ACR --> |WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN| SS
  AS -->  |WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED| SS((Success))
  ACR --> |WALLET.CONCLUDING.RESPONDER.KEEP_OPEN.CHOSEN| WO(WaitForOpponentDecision)
  WO -->|WALLET.CONCLUDING.KEEP_OPEN_SELECTED|CU(WaitForLedgerUpdate)
  CU -->|COMMITMENT_RECEIVED|CU
  CU --> |consensus update protocol succeeded|AS(InstigatorAcknowledgeSuccess)
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S,E,MT logic;
  class SS Success;
  class F Failure;
  class CU WaitForChildProtocol;
```

## Scenarios

We will use the following scenarios for testing:

1. **Happy path**: `InstigatorApproveConcluding` -> `InstigatorWaitForOpponentConclude` -> `InstigatorAcknowledgeChannelConcluded` -> `Success`
2. **Channel doesnt exist** `InstigatorAcknowledgeFailure` -> `Failure`
3. **Concluding not possible**: `InstigatorAcknowledgeFailure` -> `Failure`
4. **Concluding cancelled** `InstigatorApproveConcluding` -> `Failure` (note lack of acknowledgement screen)
