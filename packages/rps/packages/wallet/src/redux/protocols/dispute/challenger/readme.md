# Challenger Protocol

This protocol handles launching a challenge on the blockchain. It includes:

- Getting confirmation from the user to launch the challenge.
- Submitting the challenge transaction to the blockchain.
- Monitoring the blockchain for a response or timeout.
- Firing up the defunding protocol if the challenge times out (since the channel is then finalized).

Out of scope (for now)

- Halting the challenge in the case where the opponent's commitment arrives between approval and transaction submission.
- Interrupting the "ApproveChallenge" screen if the opponent's commitment arrives during approval. (Instead, the user will be informed after they approve the challenge.)
- Chain reorgs (e.g. timeout on one fork vs. response on another)
- Allowing the user to choose not to defund if the challenge times out.

## State machine

The protocol is implemented with the following state machine

```mermaid
graph TD
linkStyle default interpolate basis
  S((start)) --> CE{Can<br/>challenge?}
  CE --> |Yes| WFA(ApproveChallenge)
  WFA --> |CommitmentArrives| AF
  WFA --> |WALLET.DISPUTE.CHALLENGER.CHALLENGE_APPROVED| WFT(WaitForTransaction)
  CE --> |No| AF
  WFA --> |WALLET.DISPUTE.CHALLENGER.CHALLENGE_DENIED| AF(AcknowledgeFailure)
  AF --> |WALLET.DISPUTE.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED| F((Failure))
  WFT --> |TransactionSuccess| WFRT(WaitForResponseOrTimeout)
  WFT --> |TransactionFailure| AF
  WFRT --> |CHALLENGE_EXPIRED| AT(AcknowledgeTimeout)
  WFRT -->|ChallengeExpirySetEvent| WFRT
  AT --> |WALLET.DISPUTE.CHALLENGER.DEFUND_CHOSEN| D(WaitForDefund)
  D   --> |defunding protocol succeeded| AS(AcknowledgeSuccess)
  D   --> |defunding protocol failed| ACBND(AcknowledgeClosedButNotDefunded)
  ACBND -->|WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED| SCBND((ClosedButNotDefunded))
  AS -->|WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED| SCD((ClosedAndDefunded))
  WFRT --> |ChallengeResponseReceived| AR(AcknowledgeResponse)
  AR --> |WALLET.DISPUTE.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED| SP((Open))
  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S,CE logic;
  class SP,SCD,SCBND Success;
  class F Failure;
  class WFT,D WaitForChildProtocol;
```

Note:

- "Can challenge?" = "channel exists" && "has two commitments" && "not our turn"
- We don't currently give the option to retry in the case that the transaction fails.
- The `MyTurn` check is performed after approval, just in case the opponent's move has arrived in the meantime.

## Scenarios

To test all paths through the state machine we will the following scenarios:

1. **Opponent responds**:
   - `ApproveChallenge`
   - `WaitForTransaction`
   - `WaitForResponseOrTimeout`
   - `AcknowledgeResponse`
   - `Open`
2. **Challenge times out and is defunded**:
   - `WaitForResponseOrTimeout`
   - `AcknowledgeTimeout`
   - `ChallengerWaitForDefund`
   - `AcknowledgeSuccess`
   - `ClosedAndDefunded`
3. **Challenge times out and is not defunded**:
   - `ChallengerWaitForDefund`
   - `AcknowledgeClosedButNotDefunded`
   - `ClosedButNotDefunded`
4. **Channel doesn't exist**:
   (Challenge requested for `channelId` that doesn't exist in the wallet.) - `AcknowledgeFailure` - `Failure`

5. **Channel not fully open**:  
   (Challenge requested for channel which only has one state: two are needed to challenge.) - `AcknowledgeFailure` - `Failure`

6. **Already have latest commitment**:
   - `AcknowledgeFailure`
   - `Failure`
7. **User declines challenge**:
   - `ApproveChallenge`
   - `AcknowledgeFailure`
   - `Failure`
8. **Receive commitment while approving**:
   The opponent's commitment arrives while the user is approving the challenge - `ApproveChallenge` - `AcknowledgeFailure`
9. **Transaction fails**:
   - `WaitForTransaction`
   - `AcknowledgeFailure`
   - `Failure`
