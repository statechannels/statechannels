## Taxonomy of Actions

<a name="hierarchy"></a>

```mermaid
graph LR
linkStyle default interpolate basis
WalletAction --> WALLET.ADJUDICATOR_KNOWN
WalletAction --> AdjudicatorEventAction
WalletAction --> BLOCK_MINED
WalletAction --> WALLET.DISPLAY_MESSAGE_SENT
WalletAction --> WALLET.LOGGED_IN
WalletAction --> WALLET.MESSAGE_SENT
WalletAction --> METAMASK_LOAD_ERROR
WalletAction --> ProtocolAction
WalletAction --> NewProcessAction
WalletAction --> ChannelAction
WalletAction --> RelayableAction

subgraph AdjudicatorEventAction
AdjudicatorEventAction --> WALLET.ADJUDICATOR.CONCLUDED_EVENT
AdjudicatorEventAction --> WALLET.ADJUDICATOR.REFUTED_EVENT
AdjudicatorEventAction --> WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT
AdjudicatorEventAction --> WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT
AdjudicatorEventAction --> WALLET.ADJUDICATOR.CHALLENGE_EXPIRED_EVENT
AdjudicatorEventAction --> WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_SET_EVENT;
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
NewProcessAction --> WALLET.NEW_PROCESS.INITIALIZE_CHANNEL
NewProcessAction --> WALLET.NEW_PROCESS.FUNDING_REQUESTED
NewProcessAction --> WALLET.NEW_PROCESS.CONCLUDE_REQUESTED
NewProcessAction --> WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED
NewProcessAction --> WALLET.NEW_PROCESS.CREATE_CHALLENGE_REQUESTED
NewProcessAction --> WALLET.NEW_PROCESS.CHALLENGE_CREATED
end

subgraph ChannelAction
ChannelAction --> WALLET.CHANNEL.OPPONENT_COMMITMENT_RECEIVED
ChannelAction --> WALLET.CHANNEL.OWN_COMMITMENT_RECEIVED
end

subgraph RelayableAction
RelayableAction --> WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED
RelayableAction --> WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED
RelayableAction --> WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED
RelayableAction --> WALLET.COMMON.COMMITMENT_RECEIVED
end

subgraph CommonAction
CommonAction --> WALLET.COMMON.COMMITMENT_RECEIVED
CommonAction --> WALLET.COMMON.COMMITMENTS_RECEIVED
end

subgraph FundingAction
FundingAction --> WALLET.FUNDING.PLAYER_A.CANCELLED
FundingAction --> WALLET.FUNDING.PLAYER_A.FUNDING_SUCCESS_ACKNOWLEDGED
FundingAction --> WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED
FundingAction --> WALLET.FUNDING.PLAYER_A.STRATEGY_CHOSEN
FundingAction --> WALLET.FUNDING.PLAYER_A.STRATEGY_REJECTED
FundingAction --> WALLET.FUNDING.PLAYER_B.CANCELLED
FundingAction --> WALLET.FUNDING.PLAYER_B.FUNDING_SUCCESS_ACKNOWLEDGED
FundingAction --> WALLET.FUNDING.PLAYER_B.STRATEGY_APPROVED
FundingAction --> WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED
FundingAction --> WALLET.FUNDING.PLAYER_B.STRATEGY_REJECTED
FundingAction --> NewLedgerChannelAction
end

subgraph TransactionAction
TransactionAction --> WALLET.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED
TransactionAction --> WALLET.TRANSACTION_SUBMISSION.TRANSACTION_FAILED
TransactionAction --> WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED
TransactionAction --> WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED
TransactionAction --> WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SENT
TransactionAction --> WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED
TransactionAction --> WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMIT
end

subgraph ChallengerAction
ChallengerAction --> TransactionAction
ChallengerAction --> DefundingAction
ChallengerAction --> WALLET.DISPUTE.CHALLENGER.CHALLENGE_APPROVED
ChallengerAction --> WALLET.DISPUTE.CHALLENGER.CHALLENGE_DENIED
ChallengerAction --> WALLET.DISPUTE.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED
ChallengerAction --> WALLET.DISPUTE.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED
ChallengerAction --> CHALLENGE_EXPIRED_EVENT
ChallengerAction --> RESPOND_WITH_MOVE_EVENT
ChallengerAction --> REFUTED_EVENT
ChallengerAction --> CHALLENGE_EXPIRY_SET_EVENT
ChallengerAction --> WALLET.DISPUTE.CHALLENGER.DEFUND_CHOSEN
ChallengerAction --> WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED
end

subgraph ResponderAction
ResponderAction --> TransactionAction
ResponderAction --> DefundingAction
ResponderAction --> WALLET.DISPUTE.RESPONDER.RESPOND_APPROVED
ResponderAction --> WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED
ResponderAction --> WALLET.DISPUTE.RESPONDER.RESPOND_SUCCESS_ACKNOWLEDGED
ResponderAction --> CHALLENGE_EXPIRY_SET_EVENT
ResponderAction --> CHALLENGE_EXPIRED_EVENT
ResponderAction --> WALLET.DISPUTE.RESPONDER.DEFUND_CHOSEN
ResponderAction --> WALLET.DISPUTE.RESPONDER.ACKNOWLEDGED
end

subgraph DirectFundingAction
DirectFundingAction --> WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT
DirectFundingAction --> WALLET.DIRECT_FUNDING.DIRECT_FUNDING_REQUESTED
DirectFundingAction --> WALLET.COMMON.COMMITMENT_RECEIVED
DirectFundingAction --> TransactionAction
end

subgraph NewLedgerChannelAction
NewLedgerChannelAction --> CommonAction
NewLedgerChannelAction --> DirectFundingAction
NewLedgerChannelAction --> WALLET.NEW_LEDGER_FUNDING.PLAYER_A.STRATEGY_APPROVED
NewLedgerChannelAction --> WALLET.NEW_LEDGER_FUNDING.PLAYER_A.ALLOCATION_CHANGED
end

subgraph WithdrawalAction
WithdrawalAction --> TransactionAction
WithdrawalAction --> WALLET.WITHDRAWING.WITHDRAWAL_APPROVED
WithdrawalAction --> WALLET.WITHDRAWING.WITHDRAWAL_SUCCESS_ACKNOWLEDGED
WithdrawalAction --> WALLET.WITHDRAWING.WITHDRAWAL_REJECTED
end

subgraph ApplicationAction
ApplicationAction --> WALLET.APPLICATION.OPPONENT_COMMITMENT_RECEIVED
ApplicationAction --> WALLET.APPLICATION.OWN_COMMITMENT_RECEIVED
ApplicationAction --> WALLET.APPLICATION.CONCLUDE_REQUESTED
end

subgraph DefundingAction
DefundingAction --> WithdrawalAction
DefundingAction --> LedgerDefundingAction
end

subgraph ConcludingInstigatorAction
ConcludingInstigatorAction --> CommonAction
ConcludingInstigatorAction --> DefundingAction
ConcludingInstigatorAction --> WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED
ConcludingInstigatorAction --> WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED
ConcludingInstigatorAction --> WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN
ConcludingInstigatorAction --> WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED
end

subgraph ConcludingResponderAction
ConcludingResponderAction --> CommonAction
ConcludingResponderAction --> DefundingAction
ConcludingResponderAction --> WALLET.CONCLUDING.RESPONDER.CONCLUDE_APPROVED
ConcludingResponderAction --> WALLET.CONCLUDING.RESPONDER.DEFUND_CHOSEN
ConcludingResponderAction --> WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED
end

classDef TopLevelProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;

class DisputeAction,FundingAction,ApplicationAction,ConcludingAction TopLevelProtocol
```

# Action unions

Hopefully `ProtocolAction` is self explanatory: it is the union of top level protocol actions, each consumed by their respective protocol reducer.

`CommonAction` is the union of `MessageReceived` and `CommitmentReceived` action. These actions are used in several protocols, although mostly the CommitmentReceived action, which is often included in the `MyProtocolAction` union on its own, while the `isMyProtocolAction` guard (somewhat inconsistently) uses `isCommonAction`.

`RelayableAction` is the union of those actions that are whitelisted for communication to the opponent, who will dispatch that action.

`ChannelAction` is the union actions consumed by the channel-store reducer.

Actions not in a union handle things such as showing / hiding the wallet.
