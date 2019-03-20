# Channel opening sequence

```mermaid
sequenceDiagram
    participant R1 as RPS
    participant F1 as Funding Reducer
    participant C1 as Multi Channel Reducer
    participant C2 as Multi Channel Reducer2
    participant F2 as Funding Reducer2
    participant R2 as RPS2

    R1->>C1: W.FUNDING_REQUESTED, prefund commitment: prefund1 A1

    Note right of C1: Fund application <br> channel A1
    C1->>R2: prefund1 A1
    R2->>C2: W.FUNDING_REQUESTED, prefund commitment: prefund2 A1
    C2->>C1: prefund2 A1
    C1->>F1: W.I.FUND_CHANNEL A1
    C2->>F2: W.I.FUND_CHANNEL A1

    Note right of C1: Fund ledger <br> channel L1
    F1->>C1: W.I.OPEN_LEDGER_CHANNEL L1
    F2->>C2: W.I.OPEN_LEDGER_CHANNEL L1
    C1->>C2: prefund1 L1
    C2->>C1: prefund2 L1
    C1->>F1: W.I.FUND_CHANNEL L1
    C2->>F2: W.I.FUND_CHANNEL L1
    Note right of F1: Deposit channel L1
    Note right of C2: Deposit channel L1
    F1->>C1: W.I.FUNDING_CHANGED L1
    F2->>C2: W.I.FUNDING_CHANGED L1
    C1->>C2: postfund L1
    C2->>C1: postfund L1

    Note right of C1: Use L1 to proceed <br> with A1 funding
    C1->>F1: W.I.OPEN_CHANNEL_SUCCESS L1
    F1->>C1: W.I.ALLOCATE from: L1, to: A1
    C2->>F2: W.I.OPEN_CHANNEL_SUCCESS L1
    F2->>C2: W.I.ALLOCATE from: L1, to: A1
    C1->>C2: (updates in L1)
    C2->>C1: (updates in L1)
    C1->>F1: W.I.CONSENSUS_REACHED in L1
    F1->>C1: W.I.FUNDING_CHANGED A1
    C2->>F2: W.I.CONSENSUS_REACHED in L1
    F2->>C2: W.I.FUNDING_CHANGED A1
    C1->>C2: postfund1 A1
    C2->>C1: postfund2 A1
    C1->>R1: W.FUNDING_SUCCESS, channel: postfund2 A1
    C2->>R2: W.FUNDING_SUCCESS, channel: postfund2 A1
```
