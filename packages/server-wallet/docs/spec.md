# Nitro wallet architecture

This document describes the architectural design of a nitro wallet, and includes development principles designed to ensure performance, thread-safety and crash-tolerance/recoverability.

The following diagram describes the various components in the architecture. The scope of this document is limited to the components left of the dividing line.

```
                                      |
                                      |
                    +---------------+ |      +------------+
                    |               | |      |            |
                    | ChainWatcher  <--------> Blockchain |
                    |               | |      |            |
                    +-------^-------+ |      +------------+
                            |         |
                            |         |
                            |         |
                     +------v-----+   |              +----------+
   +-----------+     |            |   |              |          |
   |           |     |            |   |  API calls   |          |
   |   Store   <----->   Wallet   <-------------------   App    |
   |           |     |            |   |              |          |
   +-----------+     |            ------------------->          |
                     +------------+   |  Events      +----------+
                                      |
                                      |
```

## Wallet Objectives

The wallet is responsible for signing and storing states, and for helping the user to run protocols to accomplish common objectives.

Example objectives:

1. Open and directly fund channel `0xabc`
2. Close and defund `0xdef`
3. Open channel `0xabc` and fund using ledger `0x123`
4. Perform a partial withdrawal of `A: 4` from ledger `0x123` moving funds to ledger `0x456`
5. Launch a challenge in channel `0xabc`
6. Respond to the challenge in channel `0xabc` using state with hash `0x456`

In order to perform the latter responsibility, it will often need to perform operations like signing a state or sending a transaction to the blockchain without the user's explicit permission. Instead of giving permission for the individual operations, the user instead gives approval for the objective to proceed. (In some cases, the wallet might have a _policy_ that allows it to auto-approve certain objectives, e.g. "always approve close channel objectives when receiving a final state that is also the latest state").

📜 **Rules of Wallet Operations**

The wallet will only **sign a state** in two circumstances:

1. When explicitly asked to perform a state update by the app (i.e. when `updateChannel` is called)
2. When processing an approved objective

The wallet will only **send transactions** to the chain when processing an approved objective

## Introducing the Idealv0 wallet

An ideal wallet is a simplified model of a wallet. Ideal wallets accept a stream of commands, which they executes sequentially (i.e. with no parallelism). Ideal wallets are not supposed to be performant.

The motivation behind introducing the ideal wallet is that it allows us to talk about the order in which things happen in the wallet, and the states that the wallet can exist in. It basically gives us a simple model of what we consider to be _correct_ behaviour. After settling on an ideal wallet, we will then introduce a real wallet that is indistinguishable from the ideal wallet in terms of its behaviour. The real wallet _will_ be performant, and will make use of techniques such as database transactions in order to replicate the behaviour of the ideal wallet.

We first introduce a v0 ideal wallet, that we will refer to as Idealv0. Idealv0 is meant to be "a simple thing that works". We will see that some of its properties make it inherently unsuitable for building a performant real wallet that reproduces its behaviour, which will lead us to propose an Idealv1 wallet, which we will then use as the basis for the real wallet.

We first define the inputs and outputs of Idealv0:

Idealv0 accepts the following commands:

1. PushState
2. PushObjective
3. OpenChannel
4. UpdateChannel
5. CloseChannel
6. ApproveObjective
7. CrankObjective
8. UpdateChainBalance
9. UpdateAdjudicatorState

Idealv0 emits the following messages:

1. SendState
2. SendObjective
3. ChannelUpdated
4. ObjectiveToApprove
5. SubscribeToChainUpdates
6. SubmitTransaction

To define these properly we would need to write down their arguments and output. We're not going to do this, but will note one important thing: we don't restrict the data touched by these commands in any way. In the Idealv0 wallet, each of the commands acts on the full state of the wallet - they can read and write all the states. [Most of the this doc is about removing this property - limiting the scope of each command to allow us to parallelise.]

A note on CrankObjective: in a real wallet CrankObjective would be automatically triggered internally, but it seems useful to separate it out here to allow us to talk about the different points where this could be called.

**Correct behaviour:** Why does this model of the Idealv0 wallet, and the commands it accepts, help? The point is that we'll say _correct wallet behaviour_ amounts to the behaviour that results from processing a stream of these commands _in some order_.

For this definition of correct behaviour to make sense, it needs to correspond to the sort of result we want in the real world. Clearly that wouldn't be the case for any commands we could list there. The reason it makes sense here is due to properties we assume the commands have - and later should ensure:

1. Statelessness - the commands hold the minimum amount of state e.g. `CrankObjective(objectiveId)`. When executing, each command pulls the _current_ state from the store, examines it and then makes a decision of which action to take.
2. Checking preconditions - each command only applies in specific circumstances, so if the state has changed significantly since the command was queued, the command doesn't apply. This implies idempotency.

It seems like these two properties mean that a wallet behaving correctly shouldn't ever take actions that are unsafe in a protocol sense - at least corresponding to the information it has at the time.

### Correct vs useful behaviours

Alternative timelines: it's clear that changing the order of commands will often change the final state, e.g. if you UpdateChainBalance and then CrankObjective, you might get a post-fund-setup that you wouldn't get if you have these the other way round. The point is that, for us, this is still _correct_ as there's a world where the UpdateChainBalance actually _did_ happen after the CrankObjective. Same for signing states after a challenge is detected: we consider it technically correct behaviour to sign an update after a challenge is detected, because in another world we didn't detect the challenge until after we'd signed.

We therefore have multiple correct behaviours for a wallet. I think this is pretty useful to acknowledge - especially when we start running wallets with high-throughput, as it means we don't have to think hard about serializing incoming events and ensuring they execute in a precise order.

We do, however, need to make sure that our wallet is still useful. For example a wallet that never processed any chain events could (maybe?) be correct, but not useful. It seems like correctness + "processing all events in a reasonably quick amount of time" is what it takes to make a correct wallet useful.

## Crank to completion: making progress with Idealv0

In the commands above, we add CrankObjective to the common set of wallet commands from the api. The CrankObjective command is responsible for taking the next step in a protocol, driving the wallet forward. How do we know that, by taking one step at a time, a set of wallets will actually complete a protocol?

We think about CrankObjective as a command that a benevolent observer, with a complete view of the wallet, would feed in from time to time to keep the wallet moving forward. One algorithm that this observer could follow is to periodically (after every other command, for example) run a CrankToCompletion:

```tsx
function crankToCompletion() {
  let currentState = getCurrentState(); // entire state of wallet
  let doAnotherRound = true;
  while (doAnotherRound) {
    const startOfRoundState = currentState;
    for (o in Objectives) {
      currentState = crankObjective(o, currentState);
    }
    doAnotherRound = startOfRoundState !== currentState;
  }
}
```

**Potential issue: will CrankToCompletion always terminate?**

As it is written, there's no guarantee that CrankToCompletion will terminate. How can we be sure that it will?

How do we know that CrankToCompletion will terminate? I think we could argue this if we knew that every protocol can only take a finite number of steps before requiring input from a counter-party or blockchain, and that the number of channels can't increase unboundedly without input from a counter-party. In general, it seems intuitively that it must be true, given an understanding of how the state channel protocols look.

How do we know that protocols will complete if we CrankToCompletion? A CrankToCompletion is basically saying "take every possible step, until there are no more steps to take". If a protocol is completable it seems like it has to complete under that algorithm.

## Problems with Idealv0

Idealv0 gives us a way of running wallet protocols to completion. One problem is that it's not readily amenable to parallelization, as each command acts on the entire state of the wallet. To build this general behaviour we would need to lock / use isolated transactions that cover the entire database, which would essentially enforce single-threaded behaviour.

How bad is it? Do we really need the whole state? On the face of it, it seems like a lot of the commands have a naturally limited scope. If you're cranking an open-and-direct-fund objective, you'll be updating at most one channel, and reading chain data just for that channel. There's a problem when it comes to funding though.

A lot of commands need to know whether a channel is funded or not, in order to decide whether to proceed. Unfortunately deciding whether a channel is funded can involve inspecting an arbitrary amount of other channels and blockchain state.

To solve this issue, we therefore need to look at:

1. caching some information to make funding easily calculable (and adding additional wallet commands to keep the cache up-to-date)
2. examining the scope of each objective/command to allow us to predict/limit the channels affected

There's also some issues with the current CrankToCompletion algorithm - it currently iterates over every objective at each point, when we should be able to do better than that: if we know which channels the objective involves (i.e. point 2 above), we can figure out which objectives could possibly have changed this round and only crank those.

### Why would this help with a PostgreSQL implementation?

With the work above, we're trying to limit the scope (data touched) by each command as much as possible. How will that help us build a real wallet implementation in postgres?

One promising-looking technique would be to use _Serializable Isolation Level transactions_ in postgres. The basic idea here is that postgres will only commit transactions that are serializable. Effectively this means that, at the time of committing, postgres will check that any queries you performed as part of the transaction will still give the same results, and revert if they don't.

Implementing each command with a serializable transaction gives us exactly what we need in terms of replicating the behaviour of an ideal wallet, that executes commands sequentially.

The danger here is that we end up with a lot of reverts. Limiting the scope of each transaction minimizes the chance it will revert. We want to limit reverts to genuine race conditions on the same channel, rather than conflicts we have introduced by having an unnecessarily wide scope.

## Calculating Funding

To calculate the funding available to a channel, we have to look at channels whose outcomes allocate to it, and calculate the funding available to them. This is a recursive calculation that could iterate over an arbitrary number of channels.

Can we make answering the question "is this channel fully funded" a single query? One way of doing this would be to cache the funding totals e.g. by using the following funding graph.

![https://s3-us-west-2.amazonaws.com/secure.notion-static.com/bd0c86b5-dfad-4fd6-853f-42f9aeb5f4e9/Screen_Shot_2020-10-16_at_4.42.59_PM.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/bd0c86b5-dfad-4fd6-853f-42f9aeb5f4e9/Screen_Shot_2020-10-16_at_4.42.59_PM.png)

- Computed outcome takes into account the actual outcome and the funds available
- We drop any outcomes that refer to external addresses
- We don't care about outcomes for app channels

The following interface could be used to update the structure:

```tsx
interface FundingStructure {
  pushOutcome: (channelId: string, outcome) => Promise<void>;
  getBalances: (channelIds: string[]) => Promise<Balance[]>;
}
```

What properties do we need from this interface?

⚠️ **Potential issue: flickering funding**

A and B want to do a partial withdrawal from ledger L that funds channel X. They set up L', which funds X, and then update L to switch funding from X to L'. This causes the following updates in the funding table:

1. Remove `L funds X`
2. Add `L funds L'`
3. Add `L' funds X`

X is temporarily unfunded between 1 and 3. We want to ensure that X never sees this state.

It seems important that the funding interface can provide a consistent set of balances at any one point in time. For this reason, it seems that updates to multiple rows of the funding table must be done atomically. In terms of commands, this means that we should have a single command that makes all the changes for a given outcome update, instead of having individual commands to update individual rows of the table / nodes of the graph.

The requirement that we update multiple rows atomically means that we should probably be worried about whether this transaction could always fail.

⚠️ **Potential issue: funding write blocking**

A has a ledger L, that funds 100 channels, that are each updating a couple of times a second. Something catastrophic happens to L (funding reverts, or finalizes in a stale state), which means that L has to update the funding entries for all these channels, while they are still in use. We need to remove 100 lines of the form `L funds X_i` from the funding table.

We need to ensure that this transaction doesn't conflict with any transactions acquired by the channel updates. If we don't then it seems quite possible that the funding update transaction will revert every time.

Potential solutions:

1. This is a contrived edge-case - don't worry about it for now
2. Don't allow the ledger updates to put the query of the funding table in their transactions and require they call `getFunding` only once, so that they see a consistent view.
   - This effectively splits the store into states/chain + funding cache. The new property is that commands might see mismatched versions of the two halves of the store: e.g. thread one sees that a channel is funded and adds the post-fund-setup, thread two sees the post-fund-setup but doesn't see think the channel is funded (but wouldn't revert).
3. Give the funding update transaction more priority, or otherwise ensure that it isn't (always) the one that reverts. Would acquiring an update lock ensure this?

### Idealv1

We create Idealv1 from Idealv0 by adding the following features:

- A command of the form `UpdateFunding(outcome)`, which takes a single channel outcome and atomically updates the funding table updating the funding

We note that, in doing this, there is now a delay between a state update hitting the store and the effect of this update on funding being available to the objectives. This is analogous to the potential lag between on-chain funding occurring and being seen by the objectives.

## Objective scope + cranking

It seems that every objective has a set of channels that are "in scope" for it.

The **scope** of an objective is the set of channels that the objective:

1. Needs to inspect (along with their funding) to decide whether to take the next action
2. Might update as the result of the next action

Examples:

OpenAndDirectFund(channelId): scope is the channel with id channelId

OpenAndLedgerFund(channelId, ledgerId): scope is the channel + the ledger

PartialWithdraw(oldLedger, newLedger, withdrawal): scope is oldLedger + newLedger

RespondToChallenge(channelId): scope is the channel with id channelId

Claim: each objective has a finite scope, that is knowable at the point the objective is created.

### Cranking Objectives

The pattern for each crank then looks something like:

1. Start a serializable transaction
2. Query for channels within the scope and potentially their funding
3. Decide whether to take actions
4. Write to channels within the scope (queue updates to the funding table)
5. End the transaction

In the above, we've assumed that some of the chain data is stored on the channel itself. For example, with direct-funding, we need to know if we've got a pending transaction, which would therefore need to be stored somewhere on the channel object (or we add a query to a chain store).

## Ledger Funding

If we follow the cranking strategy above, ledger funding is accomplished by cranking an objective that has both the channel and the ledger channel in scope. This means that a crank will update the ledger channel itself, instead of communicating via a queue. [As we will see, the update to the ledger channel might be to add a pending update to an internal queue - but the key difference is that the ledger-fund objective has complete visibility into the state of the ledger, and the ability to change it itself, and synchronously know whether the update was successful.

This approach means that ledger funding operations can conflict with one another.

⚠️ **Potential issue: ledger funding conflicts**

We have 100 channels all wanting to be funded by the same ledger. The objectives are running simultaneously, all trying to access the ledger as a shared resource.

We need to ensure that these updates don't deadlock, or lead to a cacophony of failed transactions.

Potential solution: if we can write the exact db query that we want, we should be able to use transaction isolation to help. E.g. if the question I ask is "select the ledger channel with id X, where the sum of pending transactions < total - funding_amount" instead of "select ledger with id X" and then checking myself, then I think serializable transaction isolation will sort this out, reverting if and only if there would have been a problem.

We also need to make sure that we're still being efficient when signing states.

⚠️ **Potential issue: inefficient bulk ledger funding**

We have 100 channels that we want to be funded by the same ledger. We process the objectives one by one.

We want to ensure that we don't end up signing 100 state updates. Instead we want to somehow queue the changes and sign a single ledger update that includes them all.

It seems like a good solution to this is to separate updating a ledger into two phases:

1. Add updates to the ledger's queue
2. Process those updates into a state transition

To accomplish this we need to add another command to the wallet to create Idealv2.

Idealv2 is all the commands from Idealv1, plus:

- ProcessLedgerQueue: looks at the state of the ledger (e.g. states that have arrived from opponents), the queued updates, and signs a new ledger update.

Question: should ProcessLedgerQueue be the only operation that signs a ledger update? Answer: probably not. You'd want OpenLedger to be able to sign the opening state at the time. You'd also want PartialWithdraw to be able to switch from one ledger to another at any point, which would probably involve immediately signing a final state and transferring the queue across to a new ledger.

## Putting it all together

How general was this analysis? I think the overall argument is pretty general. Whatever approach we take, we need to decide which operations will be atomic. These operations then define the behaviour of an ideal wallet. There's a tradeoff between performance of the real wallet and the complexity of the ideal wallet: the smaller you make your operations, the easier it is to get performance, but the more complex behaviour can arise.

What does this all mean in practice?

1. We move from organising logic in protocols to organising logic in objectives.
2. Each objective crank needs its own transaction, and needs to be able to do general queries/updates within its scope (which means we'll need more than the current lock-channel/stateless-update-returning-actions approach allows)
3. We need to think carefully about the isolation level of the transactions and/or whether we need to use locking
4. We'll need to build a funding table, to cache the total funding a channel has
5. We'll need a run loop that looks something like:
   1. PushMessages / process API call (i.e. get all state updates in the store)
   2. UpdateFunding (for any channels that have changed)
   3. CrankToCompletion (for any objectives whose scope has changed)
   4. Repeat 2-3 until no more changes
   5. ProcessLedgerQueue
   6. Repeat 2-5 until no more changes. [Q: could we ever need to do 5 twice?]
   7. Return consolidated updates and states (e.g. only one update returned to the app per channel, consolidate into one message per opponent)

## Other things

### OpenChannel

The OpenChannel command naively needs access to all channels with a given set of participants, in order to figure out the latest nonce. In practice, we handle this with a nonces table. The nonces table will be in the scope of the OpenChannel command.

### Matching request/response

⚠️ **Potential issue: work stealing**

If we have two processes running CrankObjectives simultaneously, it could be that changes made by one process are picked up by the other.

E.g. A sends two packets to B, p0 containing a ledger update, and p1 containing a channel update. It could be that the reply to the ledger update comes in p1, instead of p0.

It seems to me that this is still ok. The important thing is that A's wallet gets the message to B's wallet. We just need to be aware that this could happen.

# Todo

- [ ] Sketch out how virtual funding fits in
- [ ] Sketch out how ledger top-ups and partial checkouts work
- [ ] Decide if direct funding goes in step 5 (currently called ProcessLedgerQueue)
- [ ] Change this doc from a "design doc" to a "description of the current wallet" (and include known shortcomings)
