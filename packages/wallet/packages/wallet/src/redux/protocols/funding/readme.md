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
linkStyle default interpolate basis
  S((start)) --> WFSC(WaitForStrategyChoice)

  WFSC --> |WALLET.FUNDING.PLAYER_A.STRATEGY_CHOSEN| WFSR(WaitForStrategyResponse)
  WFSR --> |WALLET.FUNDING.STRATEGY_APPROVED| WFF(WaitForFunding)
  WFF --> |FundingStrategyAction| WFF
  WFF --> |FundingStrategyAction| WFAC(WaitForPostFundSetup)

  WFAC-->|AdvanceChannelAction|WFAC
  WFAC-->|AdvanceChannelSuccess|WFSConf(WaitForSuccessConfirmation)

  WFSConf --> |WALLET.FUNDING.PLAYER_A.FUNDING_SUCCESS_ACKNOWLEDGED| SS((success))

  WFSR --> |WALLET.FUNDING.PLAYER_A.STRATEGY_REJECTED| WFSC

  WFSC --> |Cancel| F((failure))
  WFSR --> |Cancel| F
  WFSR --> |CanceledByB| F

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S logic;
  class SS Success;
  class F Failure;
  class WFF,WFAC WaitForChildProtocol;
```

### Player B

```mermaid
graph TD
linkStyle default interpolate basis
  S((start)) --> WFSP(WaitForStrategyProposal)

  WFSP --> |StrategyProposed| WFSA(WaitForStrategyApproved)

  WFSA --> |WALLET.FUNDING.PLAYER_B.STRATEGY_APPROVED| WFF(WaitForFunding)
  WFF --> |FundingStrategyAction| WFF
  WFF --> |FundingStrategyAction| WFAC(WaitForPostFundSetup)

  WFAC-->|AdvanceChannelAction|WFAC
  WFAC-->|AdvhanceChannelSuccess|WFSC(WaitForSuccessConfirmation)

  WFSC --> |WALLET.FUNDING.PLAYER_B.FUNDING_SUCCESS_ACKNOWLEDGED| SS((success))

  WFSA --> |StrategyRejected| WFSP

  WFSP --> |WALLET.FUNDING.PLAYER_B.CANCELLED| F
  WFSA --> |WALLET.FUNDING.PLAYER_B.CANCELLED| F
  WFSP --> |Cancel| F((failure))
  WFSA --> |Cancel| F

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class S logic;
  class SS Success;
  class F Failure;
  class WFF,WFAC WaitForChildProtocol;
```

Note: `WaitForFunding` should be `WaitForIndirectFunding`, since that is the child reducer currently being called. In future, the direct funding protocol may be called instead (optionally).

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
