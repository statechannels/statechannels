---
id: hook-up-messaging
title: Hook up your messaging layer
---

Although our wallet implementation does most of the heavy lifting involved in managing your state channels, one thing it does _not_ take responsibility for is message routing. For now, you must handle this in your Dapp.

To do so, you should

1. Forward messages, emitted by the wallet, to their respective addressees (state channel counterparties). The wallet will return an array of such messages under the `outbox` property of a resolved API call. When such a message is emitted, you need to route it to its recipient.

2. Push inbound messages into the wallet using the channel client's `pushMessage` method.
