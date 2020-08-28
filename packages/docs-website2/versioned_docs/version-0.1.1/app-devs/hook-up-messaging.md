---
id: hook-up-messaging
title: Hook up your messaging layer
---

Although our wallet implementation does most of the heavy lifting involved in managing your state channels, one thing it does _not_ take responsibility for is message routing. For now, you must handle this in your Dapp.

To do so, you should

1. Subscribe to outbound messages using the channel client's `onMessageQueued` method. The wallet will emit events containing messages for counterparties in the state channel. When such a message is emitted, you need to route it to its recipient.

2. Push inbound messages into the wallet using the channel client's `pushMessage` method.

Here's an example using a cloud database ([Google firebase](https://firebase.google.com/)) to route messages to and from a participant we call "hub":

```typescript
import {ChannelClient} from '@statechannels/channel-client';
const channelClient = new ChannelClient(window.channelProvider);

// Boilerplate to setup a connection to firebase
firebase.initializeApp(fireBaseConfig);

// An inbox for me
const myFirebaseRef = firebase.database().ref(`${myAddress}`);

// An inbox for the hub
const hubFirebaseRef = firebase.database().ref(`${hubAddress}`);

// More boilerplate to keep the db clean
myFirebaseRef.onDisconnect().remove();

channelClient.onMessageQueued((message: Message) => {
  if (message.recipient === hubAddress) {
    // Outbound message for the hub? Place in the hub's inbox
    hubFirebaseRef.push(message);
  }
});

myFirebaseRef.on('child_added', async snapshot => {
  const key = snapshot.key;
  const message = snapshot.val();
  // Clean up
  myFirebaseRef.child(key).remove();
  // Inbound message for me? Push into my wallet.
  await channelClient.pushMessage(message);
});
```
