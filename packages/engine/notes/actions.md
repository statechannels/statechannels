## Taxonomy of Actions

<a name="hierarchy"></a>

```mermaid
graph LR
linkStyle default interpolate basis
EngineAction --> ENGINE.ADJUDICATOR_KNOWN
EngineAction --> AdjudicatorEventAction
EngineAction --> BLOCK_MINED
EngineAction --> ENGINE.DISPLAY_MESSAGE_SENT
EngineAction --> ENGINE.LOGGED_IN
EngineAction --> ENGINE.MESSAGE_SENT
EngineAction --> METAMASK_LOAD_ERROR
EngineAction --> ProtocolAction
EngineAction --> NewProcessAction
EngineAction --> ChannelAction
EngineAction --> RelayableAction

subgraph AdjudicatorEventAction
AdjudicatorEventAction --> ENGINE.ADJUDICATOR.CONCLUDED_EVENT
AdjudicatorEventAction --> ENGINE.ADJUDICATOR.REFUTED_EVENT
AdjudicatorEventAction --> ENGINE.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT
AdjudicatorEventAction --> ENGINE.ADJUDICATOR.FUNDING_RECEIVED_EVENT
AdjudicatorEventAction --> ENGINE.ADJUDICATOR.CHALLENGE_EXPIRED_EVENT
AdjudicatorEventAction --> ENGINE.ADJUDICATOR.CHALLENGE_EXPIRY_SET_EVENT;
end

subgraph ProtocolAction
ProtocolAction --> FundingAction
ProtocolAction --> DisputeAction
ProtocolAction --> ApplicationAction
ProtocolAction --> ConcludingAction
end

subgraph DisputeAction
DisputeAction --> ChallengerAction
DisputeAction --> ResponderAction
end

subgraph ConcludingAction
ConcludingAction --> ConcludingInstigatorAction
ConcludingAction --> ConcludingResponderAction
end

subgraph NewProcessAction
NewProcessAction --> ENGINE.NEW_PROCESS.INITIALIZE_CHANNEL
NewProcessAction --> ENGINE.NEW_PROCESS.FUNDING_REQUESTED
NewProcessAction --> ENGINE.NEW_PROCESS.CONCLUDE_REQUESTED
NewProcessAction --> ENGINE.NEW_PROCESS.CONCLUDE_INSTIGATED
NewProcessAction --> ENGINE.NEW_PROCESS.CREATE_CHALLENGE_REQUESTED
NewProcessAction --> ENGINE.NEW_PROCESS.CHALLENGE_CREATED
end

subgraph ChannelAction
ChannelAction --> ENGINE.CHANNEL.OPPONENT_COMMITMENT_RECEIVED
ChannelAction --> ENGINE.CHANNEL.OWN_COMMITMENT_RECEIVED
end

subgraph RelayableAction
RelayableAction --> ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED
RelayableAction --> ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED
RelayableAction --> ENGINE.NEW_PROCESS.CONCLUDE_INSTIGATED
RelayableAction --> ENGINE.COMMON.COMMITMENT_RECEIVED
end

subgraph CommonAction
CommonAction --> ENGINE.COMMON.COMMITMENT_RECEIVED
CommonAction --> ENGINE.COMMON.COMMITMENTS_RECEIVED
end

subgraph FundingAction
FundingAction --> ENGINE.FUNDING.PLAYER_A.CANCELLED
FundingAction --> ENGINE.FUNDING.PLAYER_A.FUNDING_SUCCESS_ACKNOWLEDGED
FundingAction --> ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED
FundingAction --> ENGINE.FUNDING.PLAYER_A.STRATEGY_CHOSEN
FundingAction --> ENGINE.FUNDING.PLAYER_A.STRATEGY_REJECTED
FundingAction --> ENGINE.FUNDING.PLAYER_B.CANCELLED
FundingAction --> ENGINE.FUNDING.PLAYER_B.FUNDING_SUCCESS_ACKNOWLEDGED
FundingAction --> ENGINE.FUNDING.PLAYER_B.STRATEGY_APPROVED
FundingAction --> ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED
FundingAction --> ENGINE.FUNDING.PLAYER_B.STRATEGY_REJECTED
FundingAction --> NewLedgerChannelAction
end

subgraph TransactionAction
TransactionAction --> ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED
TransactionAction --> ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_FAILED
TransactionAction --> ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED
TransactionAction --> ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED
TransactionAction --> ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SENT
TransactionAction --> ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED
TransactionAction --> ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SUBMIT
end

subgraph ChallengerAction
ChallengerAction --> TransactionAction
ChallengerAction --> DefundingAction
ChallengerAction --> ENGINE.DISPUTE.CHALLENGER.CHALLENGE_APPROVED
ChallengerAction --> ENGINE.DISPUTE.CHALLENGER.CHALLENGE_DENIED
ChallengerAction --> ENGINE.DISPUTE.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED
ChallengerAction --> ENGINE.DISPUTE.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED
ChallengerAction --> CHALLENGE_EXPIRED_EVENT
ChallengerAction --> RESPOND_WITH_MOVE_EVENT
ChallengerAction --> REFUTED_EVENT
ChallengerAction --> CHALLENGE_EXPIRY_SET_EVENT
ChallengerAction --> ENGINE.DISPUTE.CHALLENGER.DEFUND_CHOSEN
ChallengerAction --> ENGINE.DISPUTE.CHALLENGER.ACKNOWLEDGED
end

subgraph ResponderAction
ResponderAction --> TransactionAction
ResponderAction --> DefundingAction
ResponderAction --> ENGINE.DISPUTE.RESPONDER.RESPOND_APPROVED
ResponderAction --> ENGINE.DISPUTE.RESPONDER.RESPONSE_PROVIDED
ResponderAction --> ENGINE.DISPUTE.RESPONDER.RESPOND_SUCCESS_ACKNOWLEDGED
ResponderAction --> CHALLENGE_EXPIRY_SET_EVENT
ResponderAction --> CHALLENGE_EXPIRED_EVENT
ResponderAction --> ENGINE.DISPUTE.RESPONDER.DEFUND_CHOSEN
ResponderAction --> ENGINE.DISPUTE.RESPONDER.ACKNOWLEDGED
end

subgraph DirectFundingAction
DirectFundingAction --> ENGINE.ADJUDICATOR.FUNDING_RECEIVED_EVENT
DirectFundingAction --> ENGINE.DIRECT_FUNDING.DIRECT_FUNDING_REQUESTED
DirectFundingAction --> ENGINE.COMMON.COMMITMENT_RECEIVED
DirectFundingAction --> TransactionAction
end

subgraph NewLedgerChannelAction
NewLedgerChannelAction --> CommonAction
NewLedgerChannelAction --> DirectFundingAction
NewLedgerChannelAction --> ENGINE.NEW_LEDGER_FUNDING.PLAYER_A.STRATEGY_APPROVED
NewLedgerChannelAction --> ENGINE.NEW_LEDGER_FUNDING.PLAYER_A.ALLOCATION_CHANGED
end

subgraph WithdrawalAction
WithdrawalAction --> TransactionAction
WithdrawalAction --> ENGINE.WITHDRAWING.WITHDRAWAL_APPROVED
WithdrawalAction --> ENGINE.WITHDRAWING.WITHDRAWAL_SUCCESS_ACKNOWLEDGED
WithdrawalAction --> ENGINE.WITHDRAWING.WITHDRAWAL_REJECTED
end

subgraph ApplicationAction
ApplicationAction --> ENGINE.APPLICATION.OPPONENT_COMMITMENT_RECEIVED
ApplicationAction --> ENGINE.APPLICATION.OWN_COMMITMENT_RECEIVED
ApplicationAction --> ENGINE.APPLICATION.CONCLUDE_REQUESTED
end

subgraph DefundingAction
DefundingAction --> WithdrawalAction
DefundingAction --> LedgerDefundingAction
end

subgraph ConcludingInstigatorAction
ConcludingInstigatorAction --> CommonAction
ConcludingInstigatorAction --> DefundingAction
ConcludingInstigatorAction --> ENGINE.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED
ConcludingInstigatorAction --> ENGINE.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED
ConcludingInstigatorAction --> ENGINE.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN
ConcludingInstigatorAction --> ENGINE.CONCLUDING.INSTIGATOR.ACKNOWLEDGED
end

subgraph ConcludingResponderAction
ConcludingResponderAction --> CommonAction
ConcludingResponderAction --> DefundingAction
ConcludingResponderAction --> ENGINE.CONCLUDING.RESPONDER.CONCLUDE_APPROVED
ConcludingResponderAction --> ENGINE.CONCLUDING.RESPONDER.DEFUND_CHOSEN
ConcludingResponderAction --> ENGINE.CONCLUDING.RESPONDER.ACKNOWLEDGED
end

classDef TopLevelProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;

class DisputeAction,FundingAction,ApplicationAction,ConcludingAction TopLevelProtocol
```

# Action unions

Hopefully `ProtocolAction` is self explanatory: it is the union of top level protocol actions, each consumed by their respective protocol reducer.

`CommonAction` is the union of `MessageReceived` and `CommitmentReceived` action. These actions are used in several protocols, although mostly the CommitmentReceived action, which is often included in the `MyProtocolAction` union on its own, while the `isMyProtocolAction` guard (somewhat inconsistently) uses `isCommonAction`.

`RelayableAction` is the union of those actions that are whitelisted for communication to the opponent, who will dispatch that action.

`ChannelAction` is the union actions consumed by the channel-store reducer.

Actions not in a union handle things such as showing / hiding the engine.
