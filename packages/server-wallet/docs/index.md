# What is a state channel wallet?
A node in a state channel network. See [nitro protocol](https://docs.statechannels.org/`). 

More concretely, a state channel wallet *is*: 
* a queryable store of keys and states, 
* a run-loop triggered by blockchain events, and API calls
* an event emitter

We usually talk of “The App” as the actor that makes the API calls and binds to the events. The wallet can be a library or run in a separate process to The App (e.g. on a server, or run in an iframe).

A state channel wallet *is not*:
* equipped with a graphical user interface (although this might be a desired plugin)

A state channel wallet has the following *runtime dependencies*:
* a message delivery service (deferred to The App)
* a blockchain provider (e.g. infura)
* a database (could be a Postgres server or indexedDB)

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

#  The responsibilities of a state channel wallet

As in the Hippocratic oath: /primum non nocere,/ (first, do no harm).

1. Do not lose secrets (private keys)
2. Do not leak secrets (private keys)
3. Store relevant states  (Don’t lose any unless they are screened off by kept ones, allow states to be queried)
4. Do not sign states or blockchain transactions unless the App grants permission

Next, do some active things to protect The App’s interests. 

5. With implicit permission, allow an exit on chain without losing funds
6. Detect and store blockchain challenges (for querying)
7. Detect and store changes in channel funding (for querying)

Next, do some active things to allow The App to express itself

8. With explicit permission, sign updates in application channels
9. With implicit permission, fund channels on chain

Next, allow for advanced funding relationships

10. With implicit permission, sign “safe” updates in ledger channels (meaning no funds are lost)

[More detail on responsibilities.](./responsibilities.md)


# Objective-driven Wallet architecture
In order to fulfil its responsibilities, a state channel wallet must be carefully architected. This section describes one approach that we are pursuing.

> Notice that signing a state or a blockchain transaction is only ever done with permission. 

Here, “explicit permission” shall be implied by an API call. “Implicit permission” is governed by another mechanism that we call *Objectives.*  Objectives are a device that allow for

* greater abstraction of the details of nitro protocol
* greater performance and robustness of a responsible wallet 
* easier coordination between counterparties
* short lived request-response cycle over the API

> An objective is a proposal for a goal which The App asserts that it wants to achieve.

It has a *name* and *parameters*. The parameters include a *scope*, which is a list of channelIds.

> To approve an objective is to grant permission, enabling the wallet to use the private keys it stores as it sees fit, for the channels in its scope for the lifetime of the objective.

> It is _not_ to give permission to spend money, only to sign states and transactions that are overall value-neutral (up to gas fees).

(Implementation detail) It is also to transfer ownership of those channels to the objective for the lifetime of the objective or until another more important objective is approved that takes ownership. This means that explicit updates cannot be made to a channel in the scope of an approved objective that is still alive. 

API calls spawn objectives, and resolve when they are committed to the database. Objectives can terminate during the run loop (see below), and The App is informed via an event or the return value of an API call triggering that loop.

Objectives are *cranked*. This means that when certain events happen, the wallet attempts to make progress toward the Objective goal. It does this by reading relevant, scoped data from the database, deciding on an action to take (signing a state or a transaction) and then committing the result. 

(Here, committing means: reinserting into or patching the database; broadcasting states; broadcasting transactions; responding to the API request; emitting an event. Broadcasting a state is achieved by sending it to The App, e.g. by including it in the API response. The App will deliver a message to counterparties with the new state.). 

In practice, a *cranker* is a function that accepts a store and a *response* object. It starts a database transaction; reads from the store; decides whether to write to the database; writes to the database; mutates the response and then finishes the transaction. 

# The Run loop
The *run loop* of the wallet looks like this: 

   1. Handle an API call, or hear a blockchain event:  get all state updates in the store.
   2. UpdateFunding (for any channels that have changed)
   3. CrankToCompletion (for any objectives whose scoped channels have been ‘touched’). 
   4. Repeat 2-3 until no more changes
   5. ProcessLedgerQueue (see below)
   6. Repeat 2-5 until no more changes.
   7. Return consolidated updates and states if an API call.

# Updating Funding
 TODO
# Processing the Ledger Queue
 TODO
