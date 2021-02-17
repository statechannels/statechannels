---
id: make-api-calls
title: Make Wallet API calls
---

import Mermaid from '@theme/Mermaid';

:::note
This page relates to the statechannels server wallet ONLY. It is a work in progress.
:::

In the following diagram A and B are each a separate server application each with their own statechannels server wallet instance running in the same process.

The diagram shows a typical "happy path", directly-funded state channel interaction between those applications, their respective Wallets, and the Blockchain. The id of the channel is '0xabc', for illustrative purposes.

<Mermaid chart="
sequenceDiagram
participant WalletA
participant A
participant B
participant WalletB
rect rgba(0, 0, 255, .1)
note left of WalletB: Opening a channel
A->>WalletA: createChannel();
WalletA-->>A: 0xabc: opening
WalletA-->>A: outbox: [msg0]
A->>B: msg0
B->>WalletB: pushMessage(msg0)
WalletB-->>B: 0xabc: proposed
B->WalletB: joinChannel('0xabc');
WalletB-->>B: 0xabc opening
WalletB-->>B: outbox: [msg1]
B->>A: msg1;
A->>WalletA: pushMessage(msg1);
WalletA-->>A: 0xabc: funding
WalletA->>Chain: deposit()
Chain-->>WalletA: Deposited
Chain-->>WalletB: Deposited
WalletB->>Chain: deposit()
Chain-->>WalletA: Deposited
Chain-->>WalletB: Deposited
WalletA-->>A: outbox: [msg2]
A->>B: msg2
B->>WalletB: pushMessage(msg2)
WalletB-->>B: 0xabc: running
WalletB-->>B: MessageQueued(msg3)
B->>A: msg3;
A->>WalletA: pushMessage(msg3);
WalletA-->>A: 0xabc: running
end
loop i=0...m
note left of WalletB: Running a channel
A->>WalletA: updateChannel(state-4+2i);
WalletA-->>A: 0xabc: (state-4+2i)
WalletA-->>A: outbox: [msg-4+2i]
A->>B: msg-4+2i
B->>WalletB: pushMessage(msg-4+2i)
WalletB-->>B: 0xabc: (state-4+2i)
B->>WalletB: updateChannel(state-5+2i);
WalletB-->>B: 0xabc: (state-5+2i);
WalletB-->>B: outbox: [msg-5+2i]
B->>A: msg-5+2i
A->>WalletA: pushMessage(msg-5+2i)
WalletA-->>A: 0xabc: (state-5+2i)
end
rect rgba(0, 0, 255, .1)
note left of WalletB: Closing a channel
A->>WalletA: closeChannel();
WalletA-->>A: 0xabc: closing
WalletA-->>A: outbox: [isFinalA]
A->>B: isFinalA
B->>WalletB: pushMessage(isFinal)
WalletB-->>B: 0xabc: closed
WalletB-->>B: outbox: [isFinalB]
B->>A: isFinalB
A->>WalletA: pushMessage(isFinalB)
WalletA-->>A: 0xabc: closed
WalletA->>Chain: concludePushOutcomeAndTransferAll()
Chain-->>WalletA: AllocationUpdated
Chain-->>WalletB: AllocationUpdated
end
" />
