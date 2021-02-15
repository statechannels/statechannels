---
id: make-api-calls
title: Make Wallet API calls
---

import Mermaid from '@theme/Mermaid';

:::note
This page relates to the statechannels server wallet ONLY.
:::

In the following diagram A and B are each a separate server application each with their own statechannels server wallet instance running in the same process.

The diagram shows a typical "happy path", directly-funded state channel interaction between those applications, their respective Wallets, and the Blockchain.

<Mermaid chart="
sequenceDiagram
participant WalletA
participant A
participant B
participant WalletB
rect rgba(0, 0, 255, .1)
note left of WalletB: Opening a channel
A->>WalletA: createChannel();
WalletA-->>A: outbox: [msg0]
A->>B: msg0
B->>WalletB: pushMessage(msg0)
WalletB-->>B: ChannelProposed('id')
B->WalletB: joinChannel('id');
WalletB-->>B: ChannelUpdated('funding');
WalletB-->>B: outbox:[msg1]
B->>A: msg1;
A->>WalletA: pushMessage(msg1);
WalletA-->>A: ChannelUpdated('funding')
WalletA->>Chain: deposit()
Chain-->>WalletA: Deposited
Chain-->>WalletB: Deposited
WalletB->>Chain: deposit()
Chain-->>WalletA: Deposited
Chain-->>WalletB: Deposited
WalletA-->>A: outboxL[msg2]
A->>B: msg2
B->>WalletB: pushMessage(msg2)
WalletB-->>B: ChannelUpdated('running')
WalletB-->>B: MessageQueued(msg3)
B->>A: msg3;
A->>WalletA: pushMessage(msg3);
WalletA-->>A: ChannelUpdated('running')
end
loop 0...m
note left of WalletB: Running a channel
A->>WalletA: updateChannel(state-A);
WalletA-->>A: ChannelUpdated(state-A)
WalletA-->>A: outbox:[msg-4+2m]
A->>B: msg-4+2m
B->>WalletB: pushMessage(msg-4+2m)
WalletB-->>B: ChannelUpdated(state-4+2m)
B->>WalletB: updateChannel(state-5+2m);
WalletB-->>B: ChannelUpdated(state-5+2m);
WalletB-->>B: outbox:[msg-5+2m]
B->>A: msg-5+2m
A->>WalletA: pushMessage(msg-5+2m)
WalletA-->>A: ChannelUpdated(state-5+2m)
end
rect rgba(0, 0, 255, .1)
note left of WalletB: Closing a channel
A->>WalletA: closeChannel();
WalletA-->>A: ChannelUpdated('closing')
WalletA-->>A: outbox:[isFinalA]
B->>WalletB: pushMessage(isFinal)
WalletB-->>B: ChannelUpdated('closed')
WalletB-->>B: outbox:[isFinalB]
B->>A: isFinalB
A->>WalletA: pushMessage(isFinalB)
WalletA-->>A: ChannelUpdated('closed')
WalletA->>Chain: concludePushOutcomeAndTransferAll()
Chain-->>WalletA: AllocationUpdated
Chain-->>WalletB: AllocationUpdated
end
" />
