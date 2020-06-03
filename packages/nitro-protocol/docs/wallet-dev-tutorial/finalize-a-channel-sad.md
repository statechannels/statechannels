---
id: finalize-a-channel-sad
title: Finalize a channel (sad)
---

The `forceMove` function allows anyone holding the appropriate off-chain state to register a challenge on chain. It is designed to ensure that a state channel can progress or be finalized in the event of inactivity on behalf of a participant (e.g. the current mover).

States and signatures that support a are submitted (in an optimized format), and once relevant checks have passed, an `outcome` is registered against the `channelId`, with a finalization time set at some delay after the transaction is processed. This delay allows the challenge to be cleared by a timely and well-formed [respond](#respond) or [checkpoint](#checkpoint) transaction. We'll get to those shortly. If no such transaction is forthcoming, the challenge will time out, allowing the `outcome` registered to be finalized. A finalized outcome can then be used to extract funds from the channel (more on that below, too).

## Call `forceMove`

:::note
The challenger needs to sign this data:

```
keccak256(abi.encode(challengeStateHash, 'forceMove'))
```

in order to form `challengerSig`. This signals their intent to forceMove this channel with this particular state. This mechanism allows the forceMove to be authorized only by a channel participant.
:::

We provide a handy utility function `signChallengeMessage` to form this signature.

```typescript
// In lesson7.test.ts
// construct some states as per previous tutorial steps. Then:

const variableParts = states.map(state => getVariablePart(state));
const fixedPart = getFixedPart(states[0]);

const challenger = wallets[0]; // Note that this can be *any* participant,
// and need not be the participant who owns this state.

// Sign the states
const signatures = await signStates(states, wallets, whoSignedWhat);
const challengeSignedState: SignedState = signState(
  states[states.length - 1],
  challenger.privateKey
);

const challengeSignature = signChallengeMessage([challengeSignedState], challenger.privateKey);

const tx = NitroAdjudicator.forceMove(
  fixedPart,
  largestTurnNum,
  variableParts,
  isFinalCount,
  signatures,
  whoSignedWhat,
  challengeSignature
);
```
