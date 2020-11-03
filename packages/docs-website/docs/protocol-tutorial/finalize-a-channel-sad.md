---
id: finalize-a-channel-sad
title: Finalize a channel (sad)
---

When cooperation breaks down, it is possible to finalize a state channel without requiring on-demand cooperation of all `n` participants. This is the so-called 'sad' path to finalizing a channel, and it requires a supported (but not necessarily `isFinal`) state(s) being submitted to the chain.

The `forceMove` function allows anyone holding the appropriate off-chain state(s) to register a _challenge state_ on chain. It is designed to ensure that a state channel can progress or be finalized in the event of inactivity on behalf of a participant (e.g. the current mover).

The required data for this method consist of between `1` and `n` states, along with `n` signatures that imply a [support proof](/protocol-tutorial/execute-state-transitions#support-a-state-in-several-different-ways) for the challenge state. Once these are submitted (in an optimized format), and once relevant checks have passed, an `outcome` is registered against the `channelId`, with a finalization time set at some delay after the transaction is processed. 

This delay allows the challenge to be cleared by a timely and well-formed [respond](/protocol-tutorial/clear-a-challenge#call-respond) or [checkpoint](/protocol-tutorial/clear-a-challenge#call-checkpoint) transaction. We'll get to those shortly. If no such transaction is forthcoming, the challenge will time out, allowing the `outcome` registered to be finalized. A finalized outcome can then be used to extract funds from the channel (more on that below, too).


:::tip
The `challengeDuration` is a [fixed parameter](/protocol-tutorial/execute-state-transitions#construct-a-state-with-the-correct-format) expressed in seconds, that is set when a channel is proposed. It should be set to a value low enough that participants may close a channel in a reasonable amount of time in the case that a counterparty becomes unresponsive; but high enough that malicious challenges can be detected and responded to without placing unreasonable liveness requirements on responders. A `challengeDuration` of 1 day is a reasonable starting point, but the "right" value will likely depend on your application. 
:::

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

import {signChallengeMessage} from '@statechannels/nitro-protocol';

const participants = [];
const wallets: ethers.Wallet[] = [];
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}
const chainId = '0x1234';
const channelNonce = 0;
const channel: Channel = {chainId, channelNonce, participants};

/* Choose a challenger */
const challenger = wallets[0];

/* Construct a progression of states */
const largestTurnNum = 8;
const isFinalCount = 0;
const appDatas = [0, 1, 2];
const states: State[] = appDatas.map((data, idx) => ({
  turnNum: largestTurnNum - appDatas.length + 1 + idx,
  isFinal: idx > appDatas.length - isFinalCount,
  channel,
  challengeDuration: 86400, // 1 day
  outcome: [],
  appDefinition: process.env.TRIVIAL_APP_ADDRESS,
  appData: HashZero
}));

/* Construct a support proof */
const whoSignedWhat = [0, 1, 2];
const signatures = await signStates(states, wallets, whoSignedWhat);

/* Form the challengeSignature */
const challengeSignedState: SignedState = signState(
  states[states.length - 1],
  challenger.privateKey
);
const challengeSignature = signChallengeMessage([challengeSignedState], challenger.privateKey);

/* Submit the challenge transaction */
const variableParts = states.map(state => getVariablePart(state));
const fixedPart = getFixedPart(states[0]);

const tx = NitroAdjudicator.challenge(
  fixedPart,
  largestTurnNum,
  variableParts,
  isFinalCount,
  signatures,
  whoSignedWhat,
  challengeSignature
);
```
