---
id: challenge-and-response
title: Challenge & Response
sidebar_label: Challenge & Response
---

State channel protocols must include a mechanism to resolve disputes and/or malicious or unresponsive behaviour by one or more participants.

If participants broadcast invalid commitments, **they should be ignored by all other participants**. This highlights the importance of participants being aware of the core protocol transition rules as well as the transition rules of the particular application running in their channel. Participants may wish to simulate the on chain behaviour in their client, or make read-only calls to the blockchain, in order to check the validity of commitments they send and receive. Similarly, if participants submit invalid commitments to the blockchain, they will have no effect.

Inactivity is dealt with in the following way. Any participant may call the `challenge` \(also known as the `forceMove`\) method on the Nitro Adjudicator contract:

In `force-move-games/packages/fmg-nitro-adjudicator/contracts/NitroAdjudicator.sol`:

```javascript
    function forceMove(
        Commitment.CommitmentStruct memory agreedCommitment,
        Commitment.CommitmentStruct memory challengeCommitment,
        address guaranteedChannel,
        Signature[] memory signatures
    ) public { ... }
```

This function has been written for the `n=2` participant case, and the remainder of this page also makes this simplifying assumption.

The challenger passes in agreedCommitment \(the last commitment that the **challengee** signed\) and challengeCommitment \(the last commitment that the **challenger** signed\). If the latter is a valid transition from the former, this blockchain function call triggers the beginning of a timeout period.

**Timeout**  
If the challenge times out, the channel is finalized with the current defaultOutcome. After finalization, funds may be [redistributed on chain](redistribution-of-assets.md).

**Respond with move**  
The challengee may respond with a commitment by calling the respond method on the Nitro Adjudicator. If the transition from `chalengeCommitment` \(held in the contract storage\) to `responseCommitment`\(submitted by the challengee as an argument to the function call\) is valid, the challenge is cancelled. The participants may then continue executing their state channel application.

In `force-move-games/packages/fmg-nitro-adjudicator/contracts/NitroAdjudicator.sol`:

```javascript
    function respondWithMove(
        Commitment.CommitmentStruct memory responseCommitment,
        Signature memory signature
        ) public { ... }
```

**Respond with alternative move**  
The challengee may respond in a different way, by choosing to transition from a commitment other than the challengeCommitment submitted by the challenger. It might be that, for n=2 for instance, the challenger has actually broadcast multiple distinct commitments with the same turnNum. The challengee has the right to transition from **any** such alternative commitment. In this case, the challengee calls the `alternativeRespondWithMove` method, passing in the `alternativeCommitment` as well as their `responseCommitment`. If a valid transition, the challenge is cancelled. The participants may then continue executing their state channel application.

In `force-move-games/packages/fmg-nitro-adjudicator/contracts/NitroAdjudicator.sol`:

```javascript
 function alternativeRespondWithMove(
   Commitment.CommitmentStruct memory _alternativeCommitment,
   Commitment.CommitmentStruct memory _responseCommitment,
   Signature memory _alternativeSignature,
   Signature memory _responseSignature
   ) public { ... }
```

**Refute**  
Malicious or misguided challenges, where the challenger submits **stale state** are dealt with in the following way. The challengee may call the refute function on the Nitro Adjudicator:

In `force-move-games/packages/fmg-nitro-adjudicator/contracts/NitroAdjudicator.sol`:

```javascript
function refute(
   Commitment.CommitmentStruct memory refutationCommitment,
   Signature memory signature
   ) public { ... }
```

The challengee passes in `refutationCommitment`. If this is a commitment signed by the challenger, but with a higher turnNum, the challenge is cancelled. The participants may then continue executing their state channel application.
