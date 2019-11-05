# Funding Strategy Negotiation Protocol

The strategy negotiation protocol is responsible for two players coordinating on a funding strategy.

## State machine

The protocol is implemented with the following state machines

### Player A

```mermaid
graph TD
linkStyle default interpolate basis
  S((start)) --> WFSC(WaitForStrategyChoice)

  WFSC --> |ENGINE.FUNDING_STRATEGY.PLAYER_A.STRATEGY_CHOSEN| WFSR("WaitForStrategyResponse(Strategy)")
  WFSR --> |"ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED(IndirectFunding)"|SS((success))
  WFSR --> |"ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED(VirtualFunding)"|SS((success))

  WFSR --> |ENGINE.FUNDING.PLAYER_A.STRATEGY_REJECTED| WFSC

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
  class WFVF,WFIF,WFAC WaitForChildProtocol;
```

### Player B

```mermaid
graph TD
linkStyle default interpolate basis
  S((start)) --> WFSP(WaitForStrategyProposal)

  WFSP --> |StrategyProposed| WFSA(WaitForStrategyApproved)

  WFSA --> |ENGINE.FUNDING_STRATEGY.PLAYER_B.STRATEGY_APPROVED| SS((success))


  WFSA --> |StrategyRejected| WFSP

  WFSP --> |ENGINE.FUNDING.PLAYER_B.CANCELLED| F
  WFSA --> |ENGINE.FUNDING.PLAYER_B.CANCELLED| F
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
