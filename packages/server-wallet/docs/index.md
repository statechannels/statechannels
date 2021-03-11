# What is a state channel wallet?

A node in a state channel network. See [nitro protocol](https://docs.statechannels.org/`).

More concretely, a state channel wallet _is_:

- a queryable store of keys, states and signatures
- a run-loop, triggered by

  - blockchain events
  - API calls
  - messages from counterparties

  that

  - signs states and transactions
  - stores them
  - passes them to external actors

- an event emitter

We usually talk of “The App” as the actor that makes the API calls and binds to the events. The wallet can be a library or run in a separate process to The App (e.g. on a server, or run in an iframe).

A state channel wallet _is not_:

- equipped with a graphical user interface (although this might be a desired plugin)

A state channel wallet has the following _runtime dependencies_:

- a message delivery service (provided by The App)
- a blockchain provider (e.g. infura)
- a "store", which is a wrapper around a database (could be a Postgres server or indexedDB)

The following diagram describes the various components in the architecture. The scope of this document is limited to the components left of the dividing line.

```
                                                    |
                     +-----------------+            |     +--------------+
                     |                 |            |     |              |
                     |  CHAIN-SERVICE  <------------------>  BLOCKCHAIN  |
                     |                 |            |     |              |
                     +--------^--------+            |     +--------------+
                              |                     |
                              |                     |
                        +-----v----+                |     +----------+
                        |          |                |     |          |
                        |          |                |     |          |
                        |          |  API Request   |     |          |
                        |          <-----------------------          |
                        |          |  API Response  |     |          |
         +---------+    |          ----------------------->          |
         |         |    |          |                |     |          |
         |  STORE  <--->|  WALLET  |  Events        |     |   APP    |
         |         |    |          ----------------------->          |
         +---------+    |          |                |     |          |
                        |          |                |     |          |
                        |          |  pushMessage   |     |          |
                        |          <---------------------------+     |
                        |          |                |     |    |     |
                        |          |                |     |    |     |
                        +----------+                |     +----|-----+
                                                    |          |
                                                    | +--------|---------+
                                                    | |  COUNTERPARTY    |
                                                    | |  WALLETS         |
                                                      +------------------+
```

(This diagram was created at https://textik.com/)

# The responsibilities of a state channel wallet

As in the [Hippocratic oath](https://en.wikipedia.org/wiki/Hippocratic_Oath): _primum non nocere,_ (first, do no harm).

1. Do not lose secrets (private keys)
2. Do not leak secrets (private keys)
3. Store relevant states and signatures (Don’t lose any unless they are superceded by kept ones, allow states to be queried)
4. Do not sign states or blockchain transactions unless the App grants permission

Next, do some active things to protect The App’s interests.

5. With implicit permission, allow an exit on chain without losing funds
6. Detect and store blockchain challenges
7. Detect and store changes in channel funding

Next, do some active things to allow The App to express itself

8. With explicit permission, sign updates in running application channels
9. With implicit permission, fund channels on chain

Next, allow for advanced funding relationships

10. With implicit permission, sign “safe” updates in ledger channels (meaning no funds are lost)

[More detail on responsibilities.](./responsibilities.md)

# Objective-driven Wallet architecture

In order to fulfill its responsibilities, a state channel wallet must be carefully designed. This section describes our approach. Let's consider the most important responsibility of a state channels wallet, besides secure storage of secrets and states:

> Signing a state or a blockchain transaction is only ever done with permission.

Here, “explicit permission” shall be implied by an API call. “Implicit permission” is governed by another mechanism that we call _Objectives._ Objectives are a device that allow for

- greater abstraction of the details of nitro protocol
- greater performance and robustness of a responsible wallet
- easier coordination between counterparties
- quick API calls, only involving "locally" asynchronous code

> An objective is a proposal for a goal which The App asserts that it wants to achieve.

It has a _name_ and _parameters_. The parameters include a _scope_, which is a list of channelIds.

> To approve an objective is to grant permission, enabling the wallet to use the private keys it stores as it sees fit, for the channels in its scope for the lifetime of the objective.

> It is _not_ to give permission to spend money, only to sign states and transactions that are overall value-neutral (up to gas fees).

## Implementation: the lifecycle of an objective

### Creation

Objectives are created:

1. During an API call. The API call resolves when the objective is committed to the wallet's store.

Some objecties are "shared" and involve other participants. They are therefore communicated across "the wire" to other wallets. Therefore, objectives can be created by the wallet itself when handling a peer message.

2. When a message is received from a counterparty. An implementation detail: this is also received via a (special) API method `pushMessage`.

### Approval

Approval will be _automatic_ if the objective is spawned via 1. Otherwise, if it is spawned via 2, the app will be notified of a new objective and invited to approve it.

To approve an objective is to transfer ownership of those channels to the objective for the lifetime of the objective or until another more important objective is approved that takes ownership. This means that updates cannot be made to a channel in the scope of an approved objective that is still alive. This includes updates by any other objectives as well as explicit updates from the app.

Approval of an objective requires all channels in its scope to be known to the wallet (i.e.) in it's store.

### Rejection

TODO

### Cranking

Aproved Objectives are _cranked_. This means that when certain events happen, the wallet attempts to make progress toward the Objective goal. It does this by reading relevant, scoped data from the database, deciding on an action to take (signing a state or a transaction) and then committing the result.

(Here, committing means: reinserting into or patching the database; broadcasting states; broadcasting transactions; responding to the API request; emitting an event.)

In practice, a _cranker_ is a function that accepts a store, a _response_ object, and a newly started database transaction context. It uses the transaction context to

- lock one or more database rows;
- read from the database;
- writes to the database if necessary
- mutates the response object

As a final step, metadata about objective progress is written to the database. The transaction is then commited and the row locks are released.

> Q: Which rows should be locked? One answer is: the objective row and all of the channel rows in the scope of the objective.

An objective will often be blocked on, or waiting for, external events. The wallet will track the length of time an objective is blocked, and expose this information to the app. This allows the app to choose to spawn a new objective to displace the stalled one. For example, a `SubmitChallenege` objective might displace a `CloseChannel` objective.

> Q: does the app have to first reject the stalled objective? It's scope could be different to the new objective's, so it seems like the only safe thing to do is to release the _entire_ scope of the stalled objective.

### Termination

Objectives can terminate during the run loop (see below), and The App is informed via an event or the return value of an API call triggering that loop.

# The Run loop

The _run loop_ of the wallet looks like this:

1.  Handle an API call, or hear a blockchain event: get all state updates in the store.
2.  UpdateFunding (for any channels that have changed)
3.  CrankToCompletion (for any objectives whose scoped channels have been ‘touched’).
4.  Repeat 2-3 until no more changes
5.  ProcessLedgerQueue (see below)
6.  Repeat 2-5 until no more changes.
7.  Return consolidated updates and states if an API call.

# Updating Funding

TODO

# Processing the Ledger Queue

[A Nitro ledger channel can be used to fund many other channels.](https://medium.com/statechannels/channels-funding-channels-funding-channels-3dc86450ec26), meaning a ledger channel might be "in scope" for many Objectives. Therefore, the Wallet keeps track of a queue of _requested ledger updates_. The `LedgerManager` batches many ledger requests together, executing them in a single state update.
