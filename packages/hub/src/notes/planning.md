Hub planning

# Goal

To open an RPS game between a client browser app and the hub, funded by a ledger channel.

In order to accomplish this, the hub needs to respond to communication in the following protocols:

- `Funding`
- `IndirectFunding`
- `DirectFunding`
- `Concluding`

In addition,

- The hub will need to respond to application commitments
- The hub will need to deposit to the adjudicator in the ledger channel

# Out of scope

- Challenging
- Responding to a challenge
- Withdrawing hub finds
- Monitoring deposits

# TODO

- [ ] Create a set of "communication actions".
- [ ] Write a router to route actions based on their type.

# Communication

Considering the `messageListener` saga in the client wallet, it seems to make sense to have a whitelisted set of actions that forms the communication protocol between wallets.
This allows wallet A to communicate to wallet B by wrapping the action destined for B in a `messageReceived` action.
It would also have the effect of creating a set of objects that the wallet needs to respond to.

Writing these "communication actions" in a single file would facilitate writing a hub in a language other than javascript.
It would be easier, at that point, to (as an example) have a JSON file containing the whitelisted actions, and a code generator that generates action creators in javascript, as well as objects that can be consumed in the hub language.

## Multiple Endpoints

One option is to have multiple protocols per endpoint, and have a lookup table of wallet endpoints

## Single endpoint

Another option is to have a single endpoint, and have a router route the action to a "controller" based on the action's type.

This option seems preferable, since it contains the logic within the hub.
I propose we go with this option.

# State machine?

It might eventually be a nice idea to implement a state machine, but in terms of having a functional hub to fund an app with a ledger channel, it doesn't seem necessary.

Instead, the hub can implement an API that has a definite response to a given action, as long as the channel is in the correct state.

# Storage

It seems like, if there is no need to implement a state machine, all that is needed is a "channel store", which would store

- the latest round of commitments for that channel
- (possibly) the holdings of the channel

The current DB schema already allows for this, since it stores both rps channel commitments and ledger channel commitments.

An additional table can be used for storing holdings, if needed.

# Protocols

Each protocol can define a controller that consumes actions sent from the client wallet.
They will share a significant amount of logic with the protocol reducers in the client wallet.

Because there is no user to interact with, and because the wallet will blindly deposit out of order, the hub does not need to wait in order to respond.
Therefore, the controllers will be simpler than the protocol reducers, and the effect of every action will involve returning a message to the client wallet.

## Funding

### Actions

- `strategyProposed`
- `strategyAccepted`

### Controller

- does not need to touch the database
- can simply ping back a `strategyApproved` action

## Indirect funding

### Actions

- `commitmentReceived` (pre/post-fund setup)
- `allocate_ledger_to_application` (ledger app updates)

### Controller

- receives app commitments
  - correctly responds to post-fund setup commitments
- receives ledger commitments
  - correctly responds to pre-fund setup commitments
  - increments the consensus counter if `valuePreserved` returns true

## Direct funding

### Actions

- `commitmentReceived`

### Controller

- receives ledger commitments
  - correctly responds to pre- and post-fund setup commitments
  - increments the consensus counter if `valuePreserved` returns true

### Service

- blindly deposits into ledger channel

## Concluding

### Actions

- (maybe a handshake?)
- `commitmentReceived`

### Controller

- receives ledger commitments
  - correctly responds to pre- and post-fund setup commitments
  - increments the consensus counter if `valuePreserved` returns true

## Application

### Actions

- `commitmentReceived`

### Controller

- receives app commitments
  - correctly responds to pre-fund-setup and app commitments

# Existing work

The `rpsChannelManager` can be used in the application and concluding controller.

The `ledgerChannelManager` can be used in the direct/indirect-funding controller and the concluding controller.
