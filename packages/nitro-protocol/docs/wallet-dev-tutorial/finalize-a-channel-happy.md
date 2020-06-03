---
id: finalize-a-channel-happy
title: Finalize a channel (happy)
---

If a participant signs a state with `isFinal = true`, then in a cooperative channel-closing procedure the other players can support that state. Once a full set of `n` such signatures exists \(this set is known as a **finalization proof**\) anyone in possession may use it to finalize the outcome on-chain. They would do this by calling `conclude` on the adjudicator.

## Call `conclude`

The conclude method allows anyone with sufficient off-chain state to immediately finalize an outcome for a channel without having to wait for a challenge to expire (more on that later).

The off-chain state(s) is submitted (in an optimized format), and once relevant checks have passed, an expired challenge is stored against the `channelId`. In this example the participants support the state by countersigning it, without increasing the turn number:

```typescript
// In lesson6.test.ts

import {hashAppPart, hashOutcome} = '@statechannels/nitro-protocol';

const whoSignedWhat = [0, 0, 0];
const largestTurnNum = 4;
const state: State = {
  isFinal: true,
  channel,
  outcome: [],
  appDefinition: AddressZero,
  appData: HashZero,
  challengeDuration: 1,
  turnNum: largestTurnNum,
};

const numStates = 1;
const fixedPart = getFixedPart(state);
const appPartHash = hashAppPart(state);
const outcomeHash = hashOutcome(state.outcome);
const sigs = await signStates([state], wallets, whoSignedWhat);

const tx = NitroAdjudicator.conclude(
  largestTurnNum,
  fixedPart,
  appPartHash,
  outcomeHash,
  numStates,
  whoSignedWhat,
  sigs
);

```

---
