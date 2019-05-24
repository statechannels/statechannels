# Action Routing

**[Home](./index.md)**

## The Action Routing Problem

If we have multiple protocols running in the wallet simultaneously, we need a way of identifying
which protocol a given action should apply to. This applies to the majority of our actions,
including messages from an opponent, transaction updates from the blockchain or UI interaction
by the user.

We model each protocol as running inside a given process, which is identifiable by a `processId`.
These protocols can be constructed from other protocols, so it is possible to have a 'parent protocol'
running inside a process, with several 'child protocols' running (perhaps simultaneously)
inside it. We will refer to the set of nested protocols running at any one time inside a
single process as the _protocol tree_.

## Current proposal: `processId`

The current proposal is to include a `processId` on all actions that should be routed to an
existing protocol. We call these 'existing-process' actions. A top-level router would
forward these on to the relevant process, which would then forward them on to child
protocols if appropriate.

## Problems with the current proposal

The current proposal gives a way for actions to be routed to the correct process but _doesn't_
provide any information as to how to route them further.

As a concrete example, suppose we have a protocol for withdrawing from a channel nested inside
a ledger channel. It's possible that we would want to attempt to submit a couple of blockchain
transactions in parallel (perhaps from separate accounts to get around nonce issues). When
the process receives a `TransactionConfirmed` event, it sends it to the parent protocol. The
parent protocol needs to somehow decide which of the sub-protocols this event applies to.

As another example, suppose we have a protocol for responding to a challenge which wants to
handle the case where you respond to the challenge but then receive a state that you could
refute with from your opponent. The protocol wants to allow the user to submit a refute transaction
with the same nonce and a higher gas amount, hoping to replace the original response. Again,
it is important for the protocol to be able to understand which of the two transaction-submitted
sub-protocols a `TransactionConfirmed` event applies to in this case.

## Proposed Solution

Here's one possible solution to this problem:

1. We replace the `processId` with a `protocolLocator` string.
2. The `protocolLocator` would look something like `process-123.refute-transaction.attempt-1`.
3. The first section of the string would be used to identify the process and then the remainder
   used to route the action within that process.
4. The information beyond the `processId` is optional. If there's only one path down the protocol
   tree, then the protocolLocator could just be the `processId`. It's just a place for protocols
   to add information if required.

## Proposed Implementation

There are many ways to implement this. The key property we need is that each node in the protocol tree
should have the opportunity to add to the `protocolLocator` for actions emanating from its
subtree and can then use this information to route any return actions. I propose the following
approach:

1. Every `protocolState` stores a `protocolLocator` property.
2. This `protocolLocator` is passed in by the parent. In the case of a top-level protocol
   the `protocolLocator` would just be the `processId`.
3. The protocol is responsible for putting the `protocolLocator` onto any outgoing actions/requests
   and for passing it into any child protocols. It is free to add additional information to
   the end of the locator before it does this.
4. When it receives an action it can recover the information added by (1) removing the
   `protocolLocator` stored in its state and (2) pulling off the next property (if it added one).
   It can then handle this action or route it to a child as appropriate.

## Alternatives Considered

### Alternative Implementation

One alternative here would be to not store the `protocolLocator` on the `protocolState` and
instead ensure that all actions are passed back up the protocol tree, allowing the nodes
above to modify the action itself. This seems nicer in some ways (it seems neat that the
protocol doesn't need to be aware of its location) but also seems harder to implement:
we'd need to move back to passing side-effects back from the protocols and come up with a
strategy for modifying the action creators as we pass them through containers and components.

### Alternative Data Structure

We could make the `processLocator` an object. This object would always have a `processId`
and optionally have other properties. We might get some type safety benefits from this
but I can't quite see how this would play out and it might not be worth it.

### Alternative Names

Here are some alternatives for the name of the `processLocator` property:
`location`, `processLocation`, `route`, `path`, `executionPath`, `protocolLocation`,
`protocolPath`, `breadcrumbs`, `routeInfo`, `destinationInfo`, `directions`.
