# Virtual Funding

The virtual funding protocol coordinates the process of funding an application channel,
X by a virtual channel, J, covered by two guarantor channels G0, G1, that are funded by
ledger channels L0, L1, respectively.

- Preparing the required guarantor channel.
- Preparing the virtual channel that allocates first to the application channel and then to the hub.
- Updating the guarantor channel to cover the virtual channel's outcome
- Preparing and/or updating the ledger channel to fund the guarantor channel

### Decisions

1. Each participant only sends commitments to the next participant. This makes communication predictable in a 3-way channel. (This decision will actually apply to the `AdvanceChannel` and `UpdateConsensus` protocols, and not directly to the virtual funding protocol)

2. The post-fund-setup phase is redundant when preparing G or J -- as consensus channels, allocations cannot change until a full round anyway. Therefore, we progress G and J straight to application phase phase. This decision will actually apply to the `AdvanceChannel` protocol, and not directly to the virtual funding protocol. However, this precludes the need to further update these channels after the indirect-funding step.

## The Protocols

The virtual funding protocol involves three parties: player 0, player 1, and the hub H.
Player 0 is identified by being the participant at index 0 in the `participants` array in
the application channel X that is to be funded.

In the following overview diagram, some communication related to embedded protocols are omitted.

```mermaid
sequenceDiagram
  participant 0 as 0's wallet
  participant H as Hub
  participant 1 as 1's wallet

  Note over 0, 1: Prepare J, allocating to 0, 1 and H
  Note over 1, H: Prepare J, allocating to 0, 1 and H
  Note over H, 0: Prepare J, allocating to 0, 1 and H
  0->>H: (actions omitted)
  1->>H: (actions omitted)
  H->>0: (actions omitted)
  H->>1: (actions omitted)

  Note over 0, H: Prepare G0, covering [0, H]
  0->>H: (actions omitted)
  H->>0: (actions omitted)

  Note over 1, H: Prepare G1, covering [1, H]
  1->>H: (actions omitted)
  H->>1: (actions omitted)

  Note  over 0, H: Fund G0
  0->>H: Prepare and/or update L0 to fund G0 (0)
  H->>0: Prepare and/or update L0 to fund G0 (1)

  Note  over 1, H: Fund G1
  1->>H: Prepare and/or update L1 to fund G1 (0)
  H->>1: Prepare and/or update L1 to fund G1 (1)

  Note  over 0, 1: Fund X
  Note  over 0, H: Fund X
  Note  over 1, H: Fund X
  0->>1: Update J to fund X (0)
  1->>H: Update J to fund X (1)
  H->>0: Update J to fund X (2)


  Note  over 0, 1: Postfund for X
  0->>1: PostFund0 for X
  1->>0: PostFund1 for X
```

## State machine diagram

```mermaid
graph TD
linkStyle default interpolate basis
  St((start)) --> WFJ("WaitForJoint: AdvanceChannel(J)")
  WFJ --> |Prepared| WFG("WaitForGuarantor: AdvanceChannel(G)")

  WFG --> |"Prepared"| WFGF("WaitForGuarantorFunding: IndirectFunding(G)")

  WFGF --> |GuarantorFunded| WFAF("WaitForApplicationFunding: UpdateConsensus(J)")
  WFAF --> |ApplicationFunded| S((success))

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class St logic;
  class S Success;
  class F Failure;
  class WFAp,Fi,WFG,WFJ,WFAF,WFGF WaitForChildProtocol
```
