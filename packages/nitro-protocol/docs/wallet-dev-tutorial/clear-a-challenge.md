---
id: clear-a-challenge
title: Clear a challenge
---

A challenge being registered does _not_ mean that the channel will inexorably finalize. Participants have the timeout period in order to be able to respond. Perhaps they come back online after a brief spell of inactivity, or perhaps the challenger was trying to (maliciously) finalize the channel with a supported but outdated (or 'stale') state.

## Call `checkpoint`

The `checkpoint` method allows anyone with a supported off-chain state to establish a new and higher `turnNumRecord` on chain, and leave the resulting channel in the "Open" mode. It can be used to clear a challenge.

```typescript
// Register a challenge with a very long timeout, following the preceding tutorial step
// Form a new support proof (you should be familiar with how to do this by now) with an increased largestTurnNum
// Submit this transaction:

const tx = NitroAdjudicator.checkpoint(
  fixedPart,
  largestTurnNum,
  variableParts,
  isFinalCount,
  signatures,
  whoSignedWhat
);

await(await tx).wait();

// Form an expectation about the new state of the chain:
const expectedChannelStorageHash = channelDataToChannelStorageHash({
  turnNumRecord: largestTurnNum,
  finalizesAt: 0x0, // 0 here implies the channel is open again.
});

// Check channelStorageHash against the expected value (it is a public mapping)
expect(await NitroAdjudicator.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
```

## Call `respond`

The respond method allows anyone with the appropriate, _single_ off-chain state (usually the current mover) to clear an existing challenge stored against a `channelId`. This might be significantly cheaper than calling checkpoint (it leverages the fact that the chain has already seen a support for the challenge state, so providing a single validTransition from the challenge state to the response state implies the existence of a support proof for the response state).

```typescript
largestTurnNum += 1;
const responseState: State = {
  turnNum: largestTurnNum,
  isFinal: false,
  channel,
  outcome: [],
  appDefinition: process.env.TRIVIAL_APP_ADDRESS,
  appData: HashZero,
  challengeDuration,
};

const responder = wallets[0];
const responseSignature = await signState(responseState, responder.privateKey).signature;
const isFinalAB = [false, false];
const variablePartAB = [
  getVariablePart(challengeSignedState.state),
  getVariablePart(responseState),
];

const tx = NitroAdjudicator.respond(
  challenger.address,
  isFinalAB,
  fixedPart,
  variablePartAB,
  responseSignature
);
await(await tx).wait();

// Form an expectation about the new state of the chain:
const expectedChannelStorageHash = channelDataToChannelStorageHash({
  turnNumRecord: largestTurnNum,
  finalizesAt: 0x0, // 0 here implies the channel is open again.
});

// Check channelStorageHash against the expected value (it is a public mapping)
expect(await NitroAdjudicator.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
```

## Scrape info from Adjudicator Events

You may have noticed that to respond, the challenge state itself must be (re)submitted to the chain. To save gas, information is only stored on chain in a hashed format. Clients should, therefore, cache information emitted in Events emitted by the adjudicator, in order to be able to respond to challenges.

```typescript
// Prepare a forceMove transaction as above, and store the transaction receipt
const receipt = await(
  await NitroAdjudicator.forceMove(
    fixedPart,
    largestTurnNum,
    variableParts,
    isFinalCount,
    signatures,
    whoSignedWhat,
    challengeSignature
  )
).wait();

const event = receipt.events.pop();

// Scrape the information out of the ForceMove event
const {
  channelId: eventChannelId,
  turnNumRecord: eventTurnNumRecord,
  finalizesAt: eventFinalizesAt,
  challenger: eventChallenger,
  isFinal: eventIsFinal,
  fixedPart: eventFixedPart,
  variableParts: eventVariableParts,
} = event.args;
```

---
