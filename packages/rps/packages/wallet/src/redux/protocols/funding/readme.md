# Funding Protocol

The purpose of this protocol is to

1. Determine the funding strategy that will be used to fund a channel
2. Initialize the protocol for the corresponding strategy
3. Route further actions to that strategy's protocol

It should be triggered by the `FUNDING_REQUESTED` event from the app.
On success, it should send `FUNDING_SUCCESS` to the app.

Out of scope (for now):

- Supporting protocols other than indirect funding
- Recovering from a partially successful process

## State machine

The protocol is implemented with the following state machines

### Player A

```mermaid
graph TD
  S((start)) --> WFSC(WaitForStrategyChoice)

  WFSC --> |StrategyChosen| WFSR(WaitForStrategyResponse)
  WFSR --> |StrategyApproved| WFF(WaitForFunding)
  WFF --> |FundingStrategyAction| WFF
  WFF --> |FundingStrategyAction| WFSConf(WaitForSuccessConfirmation)

  WFSConf --> |ConfirmSuccess| SS((success))

  WFSR --> |StrategyRejected| WFSC

  WFSC --> |Cancel| F((failure))
  WFSR --> |Cancel| F
  WFSR --> |CanceledByB| F
```

### Player B

```mermaid
graph TD
  S((start)) --> WFSP(WaitForStrategyProposal)

  WFSP --> |StrategyProposed| WFSA(WaitForStrategyApproved)

  WFSA --> |StrategyApproved| WFF(WaitForFunding)
  WFF --> |FundingStrategyAction| WFF
  WFF --> |FundingStrategyAction| WFSC(WaitForSuccessConfirmation)

  WFSC --> |ConfirmSuccess| SS((success))

  WFSA --> |StrategyRejected| WFSP

  WFSP --> |CanceledByB| F
  WFSA --> |CanceledByB| F
  WFSP --> |Cancel| F((failure))
  WFSA --> |Cancel| F
```

### Communication

```mermaid
sequenceDiagram
  participant A as A's wallet
  participant B as B's wallet

  Note over A, B: Agree on strategy
  A->>B: type: funding_proposed
  B->>A: type: funding_approved
  Note  over A, B: Run indirect funding
  A->>B: type: strategy_communication
  B->>A: type: strategy_communication
```
