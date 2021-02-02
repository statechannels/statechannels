# Implementation

This document describes some of the differences you should expect to find between the specification and the current implementation of a nitro wallet living in this package.

## Objective types
The currently-existing [list of named Objectives](../../wallet-core/src/types.ts)
 is incomplete. Some Objectives are deemed to be Shared, and others are not (those that involve participants other than me).

## Signing rules
The wallet currently signs states:
- during `updateChannel` (OK)
- in the ledger-manager, channel-opener, close-channel (soon to be channel-closer protocol). In other words, during objective cranking. Only approved objectives are cranked. (OK)
- in test code (OK)
- during the createChannel API call (not OK?)


## Cranking
Cranking is currently triggered as the final step in most API calls. 

`crankToCompletion` is currently called `crankUntilIdle`. The control flow is not a simple while loop, though. There are two patterns in play.

Pattern 1: A protocol state is derived from the store, and a protocol action is inferred from that state. The action is then "applied" by modifying the store. There is a special noAction case which causes the while loop to exit.

Pattern 2: various tests are applied to the store, in order, and zero or several side effects triggered if the respective test applies. Then, the objective is idle until it is cranked again. 

Protocols that end in er generally follow Pattern 2, except for the ledger-manager.

## Database techniques
We do not currently used serializable isolation level transactions in postgres. We currently lock rows using `lockApp` or `getAndLockChannel`, which use objection's `forUpdate` (i.e. `SELECT FOR UPDATE`)

## Funding cache
This has not yet been implemented at all.

## Scope of an objective
The store has a getChannelIdsPendingLedgerFundingFrom() method, and the scope is constructed as the concatenation of the output of this function with the channels in the scope of the API call that triggered the crank. Only the objectives covering channels in scope are cranked. The "scope" terminology is not in use in the codebase just now 

## Run loop
We have something similar, with the following differences:
- Update funding happens entirely "off-loop". it does not trigger the run-loop / cranking.

Question: we don't use "run loop" in the codebase. Instead we use takeActions.