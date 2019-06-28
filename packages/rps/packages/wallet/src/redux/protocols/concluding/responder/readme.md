# Concluding Protocol (Responder)

The purpose of this protocol is to respond to the instigation of a concluding a channel, i.e. your opponent's transmission of a conclude commitment.

It covers:

- Assume a conclude commitment has already been received and a higher level process has then triggered this protocol
- Asking user to confirm the resignation (probably displaying the current outcome)
- Formulating the conclude state and sending to the opponent
- Acknowledge channel concluded (giving the option to defund)

Out of scope (for the time being):

- Allowing responder to not conclude

## State machine

The protocol is implemented with the following state machine

```mermaid
graph TD
linkStyle default interpolate basis
  S((Start)) --> E{Channel Exists?}
  E --> |No| AF(ResponderAcknowledgeFailure)
  AF -->|WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED| F((Failure))
  E --> |Yes| MT{My turn?}
  MT  --> |Yes| CC(ResponderApproveConcluding)
  MT  --> |No| AF(ResponderAcknowledgeFailure)
  CC  --> |WALLET.CONCLUDING.RESPONDER.CONCLUDE.APPROVED| DD(ResponderDecideDefund)
  DD --> |WALLET.CONCLUDING.RESPONDER.DEFUND.CHOSEN| SS
  DD --> |WALLET.CONCLUDING.RESPONDER.KEEP_OPEN.CHOSEN| WO(WaitForOpponentDecision)
  WO -->|WALLET.CONCLUDING.KEEP_OPEN_SELECTED|CU(WaitForLedgerUpdate)
  CU -->|COMMITMENT_RECEIVED|CU
  CU --> |consensus update protocol succeeded|AS(AcknowledgeSuccess)
  AS -->  |WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED| SS((Success))
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S,E,MT logic;
  class SS Success;
  class F Failure;
  class D,CU WaitForChildProtocol;
```

## Scenarios

We will use the following scenarios for testing:

1. **Happy path**: `ResponderApproveConcluding` -> `ResponderDecideDefund` -> `ResponderSuccess`
2. **Channel doesnt exist** `ResponderAcknowledgeFailure` -> `ResponderFailure`
3. **Concluding not possible**: `ResponderAcknowledgeFailure` -> `ResponderFailure`
4. **Defund failed** `ResponderWaitForDefund` -> `ResponderAcknowledgeFailure` -> `ResponderFailure`
