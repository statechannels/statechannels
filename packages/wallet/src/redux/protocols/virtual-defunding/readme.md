# Virtual De-Funding

The virtual de-funding protocol takes a virtual channel that is funding an application channel and de-funds it resulting updated ledger channels with the hub.

The virtual de-funding protocol starts with the following channels:

- The application channel X which is now concluded.
- The virtual channel J which funds X
- Guarantor channels G0 (between player 0 and the hub) and G1(between player 1 and the hub)
- Ledger channels L0(which funds G0) and L1(which funds G1)

The virtual de-funding protocol does the following

- Updates J to reflect the results of X
- Updates L0 to reflect the results of J
- Updates L1 to reflect the results of J

After the protocol is run bother player 0 and player 1 have updated ledger channels with the hub that reflect the result of X.

The virtual de-funding protocol leaves these ledger channels open so they can be re-used in the future or closed by another protocol.

The Guarantor channels G0 and G1 as well as the joint channel J do not need to be updated and can simply be discarded after virtual de-funding.

The virtual de-funding protocol involves three parties: player 0, player 1, and the hub H.
Player 0 is identified by being the participant at index 0 in the `participants` array in
the application channel X that is to be funded.

In the following overview diagram, some communication related to embedded protocols are omitted.

```mermaid
sequenceDiagram
  participant 0 as 0's wallet
  participant H as Hub
  participant 1 as 1's wallet

  Note over 0, 1: Updating J, allocating to 0, 1 and H
  Note over 1, H: Updating J, allocating to 0, 1 and H
  Note over H, 0: Updating J, allocating to 0, 1 and H
  0->>H: (actions omitted)
  1->>H: (actions omitted)
  H->>0: (actions omitted)
  H->>1: (actions omitted)

  Note over 0, H: Update L0, covering [0, H]
  0->>H: (actions omitted)
  H->>0: (actions omitted)

  Note over 1, H: Update L1, covering [1, H]
  1->>H: (actions omitted)
  H->>1: (actions omitted)

```

## Out of Scope

- Getting funds out of the ledger channels (this can be handled by other protocols).
- Removing discarded channels G0,G1,J from state.

## State machine diagram

```mermaid
graph TD
linkStyle default interpolate basis
  St((start)) --> WFJ("WaitForJointChannelUpdate")
  WFJ --> |ConsensusUpdateAction|WFJ
  WFJ -->|ConsensusUpdateSuccess|WFLU(WaitForLedgerUpdate)
  WFLU-->|ConsensusUpdateAction|WFLU
  WFLU-->|ConsensusUpdateSuccess| S((success))

  classDef logic fill:#efdd20;
  classDef Success fill:#58ef21;
  classDef Failure fill:#f45941;
  classDef WaitForChildProtocol stroke:#333,stroke-width:4px,color:#ffff,fill:#333;
  class St logic;
  class S Success;
  class F Failure;
  class WFJ,WFLU WaitForChildProtocol
```
