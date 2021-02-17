---
id: make-api-calls
title: Make Wallet API calls
---

import Mermaid from '@theme/Mermaid';

:::note
This page relates to the statechannels browser wallet (and related tooling) ONLY.
:::

## Direct Funding

In the following diagram, `p = window.channelProvider`, and Client(A/B) is an instance of the [`ChannelClient` class](https://www.npmjs.com/package/@statechannels/channel-client) created by each participants' application.

The diagram shows a typical "happy path", directly-funded state channel interaction between two instances A and B of ChannelClient, their respective Wallets, and the Blockchain.

Also shown is the "activation" of each wallet at certain times, indicating the UI will popup and the user may be required to send a blockchain transaction or otherwise signal their intent to perform an action.

<Mermaid chart="
sequenceDiagram
participant WalletA
participant ClientA
participant ClientB
participant WalletB
par setup for Wallet A
ClientA->>WalletA: p.mountWalletComponent();
ClientA->>WalletA: p.enable();
ClientA->>WalletA: onMessageQueued(callback)
ClientA->>WalletA: onChannelProposed(callback)
ClientA->>WalletA: onChannelUpdated(callback)
and setup for Wallet B
ClientB->>WalletB: p.mountWalletComponent();
ClientB->>WalletB: p.enable();
ClientB->>WalletB: onMessageQueued(callback)
ClientB->>WalletB: onChannelProposed(callback)
ClientB->>WalletB: onChannelUpdated(callback)
end
rect rgba(0, 0, 255, .1)
note left of WalletB: Opening a channel
ClientA->>WalletA: createChannel();
WalletA-->>ClientA: ChannelUpdated('proposed')
WalletA-->>ClientA: MessageQueued(msg0)
ClientA->>ClientB: msg0
ClientB->>WalletB: pushMessage(msg0)
WalletB-->>ClientB: ChannelProposed('id')
ClientB->>+WalletB: joinChannel('id');
WalletB-->>ClientB: ChannelUpdated('funding');
WalletB-->>ClientB: MessageQueued(msg1)
ClientB->>ClientA: msg1;
ClientA->>+WalletA: pushMessage(msg1);
WalletA-->>ClientA: ChannelUpdated('funding')
WalletA->>Chain: deposit()
Chain-->>WalletA: Deposited
Chain-->>WalletB: Deposited
WalletB->>Chain: deposit()
Chain-->>WalletA: Deposited
Chain-->>WalletB: Deposited
WalletA-->>ClientA: MessageQueued(msg2)
ClientA->>ClientB: msg2
ClientB->>WalletB: pushMessage(msg2)
WalletB-->>-ClientB: ChannelUpdated('running')
WalletB-->>ClientB: MessageQueued(msg3)
ClientB->>ClientA: msg3;
ClientA->>WalletA: pushMessage(msg3);
WalletA-->>-ClientA: ChannelUpdated('running')
end
loop i=0...m
note left of WalletB: Running a channel
ClientA-->>ClientA: Wait for UI
ClientA->>WalletA: updateChannel(state-A);
WalletA-->>ClientA: ChannelUpdated(state-A)
ClientA-->>ClientA: Update UI
WalletA-->>ClientA: MessageQueued(msg-4+2i)
ClientA->>ClientB: msg-4+2i
ClientB->>WalletB: pushMessage(msg-4+2i)
WalletB-->>ClientB: ChannelUpdated(state-4+2i)
ClientB-->>ClientB: Update UI
ClientB-->>ClientB: Wait for UI
ClientB->>WalletB: updateChannel(state-5+2i);
WalletB-->>ClientB: ChannelUpdated(state-5+2i);
ClientB-->>ClientB: Update UI
WalletB-->>ClientB: MessageQueued(msg-5+2i)
ClientB->>ClientA: msg-5+2i
ClientA->>WalletA: pushMessage(msg-5+2i)
WalletA-->>ClientA: ChannelUpdated(state-5+2i)
ClientA-->>ClientA: Update UI
end
rect rgba(0, 0, 255, .1)
note left of WalletB: Closing a channel
ClientA-->>ClientA: Wait for UI
ClientA->>WalletA: closeChannel();
activate WalletA
WalletA-->>ClientA: ChannelUpdated('closing')
WalletA-->>ClientA: MessageQueued(isFinalA)
ClientA->>ClientB: isFinalA
ClientB->>WalletB: pushMessage(isFinal)
activate WalletB
WalletB-->>ClientB: ChannelUpdated('closed')
WalletB-->>ClientB: MessageQueued(isFinalB)
ClientB->>ClientA: isFinalB
ClientA->>WalletA: pushMessage(isFinalB)
WalletA-->>ClientA: ChannelUpdated('closed')
WalletA->>Chain: concludePushOutcomeAndTransferAll()
deactivate WalletA
deactivate WalletB
Chain-->>WalletA: AllocationUpdated
Chain-->>WalletB: AllocationUpdated
end
" />
