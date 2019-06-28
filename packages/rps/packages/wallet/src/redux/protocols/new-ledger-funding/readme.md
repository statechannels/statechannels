# New Ledger Funding

The new ledger funding protocol coordinates the process of funding an application channel, X, via a ledger channel, L.

- Opening + funding the ledger channel
- Updating the ledger channel to fund the the application channel

Out of scope (for now):

- Using an existing ledger channel if one is available
- Handling the case where an opponent stalls mid-protocol

## The Protocol

The indirect funding protocol involves two parties: player A and player B.
Player A is identified by being the first participant in the `participants` array in
the application channel X that is to be funded.

We therefore split the overall indirect-funding protocol into two sub-protocols: the
[player-a-indirect-funding protocol](./player-a/readme.md) and the [player-b-indirect-funding protocol](./player-b/readme.md).

The two protocols interact through the following messages:

```mermaid
sequenceDiagram
  participant A as A's wallet
  participant B as B's wallet

  Note  over A, B: Open L
  A->>B: PreFund0 for L
  B->>A: Prefund1 for L
  Note  over A, B: Directly fund L (sub-protocol)
  Note  over A, B: Fund X with L
  A->>B: Update L to fund X (0)
  B->>A: Update L to fund X (1)
  Note  over A, B: Postfund for X
  A->>B: PostFund0 for X
  B->>A: PostFund1 for X
```
