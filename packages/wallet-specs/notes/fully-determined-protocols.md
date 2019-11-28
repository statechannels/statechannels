# Fully-Determined Protocols

A _fully-determined_ protocol contains all the information to specify the states that should be exchanged as part of the protocol.
Put another way: once a set of wallets know that they are executing a given fully-determined protocol, they shouldn't need any communication beyond the exchange of state channel states.

For example, the protocol

```
OpenChannel(participants, balances, appDefinition, appData) // not fully-determined
```

is _not_ fully-determined, as in order to construct the states a `channelNonce` is needed. The fully-determined version of this protocol would need to include the `channelNonce`:

```
OpenChannel(participants, balances, appDefinition, appData, channelNonce) // fully-determined
```

## [WIP] List of fully-determined protocols

- `CreateNullChannel(channel, outcome)`
  - Reaches consensus on outcome on turn 0
- `JoinChannel(ctx: JsonRpcJoinChannelParams)`
  - Each participant checks to see they don't have a nonce collision
  - After pre-fund round is complete, invoke `Fund(channelId)`
  - Once funded, exchange post-fund setup
  - Succeeds when channel is funded
- `DirectFundingStrategy(channelId, balances, turnNum?)`
  - Abandon if channel doesn't exist or channel has `appDefinition`
  - pre-funding: arrange outcome to allow top-up if necessary
  - Fund when it's your turn.
  - post-funding: arrange outcome to merge allocation items
  - Succeeds when post-fund outcome is supported
  - Do we need a turnNum?
- `PartialWithdrawal(ledgerId, participant, amount, newNonce, newParticipants)`
  - Will need to call `CreateNullChannel` to create a replacement ledger channel.
- `LedgerFund(channelId, ledgerId, ledgerTurnNum)`
  - Assumes ledger exists
  - Ends when `channelId` is funded
- `VirtualFundAsLeaf(balances, ledgerID, jointChannel, guarantorChannel)`
  - Used by "leaf" (endpoint?) in virtual funding. IE. A or B
  - Assumes that a ledger exists between leaf and hub
- `VirtualFundAsHub(balances, ledgerABId, jointNonce, guarantorANonce, guarantorBNonce)`
  - Used by intermediary in virtual funding
  - Spawned as new process on receipt of request for service
  - Assumes that the `ledgerAB` already exists

## List of "undetermined" protocols

- `CreateChannel(ctx: JsonRpcCreateChannelParams)`
  - First participant chooses a nonce, and notifies all other participants
  - After pre-fund round is complete, invoke `Fund(channelId)`
  - Once funded, exchange post-fund setup
- `Fund(channelId)`
  - Participants choose a funding strategy
  - On agreement, they invoke either `DirectFundingStrategy`, `LedgerFundingStrategy` or `VirtualFundingStrategy`
- `LedgerFundingStrategy(channelId)`
  - Participants use an existing ledger, or open a new ledger
    - if existing ledger exists, they use it
  - Invokes `DirectFundingStrategy` if ledger is already directly funded but needs more funding
  - Invokes `Fund(ledgerId)` otherwise
  - When the ledger is sufficiently funded, invoke `LedgerFund(channelId, ledgerId)`
- `VirtualFundingStrategy(channelId)`
  - Participants negotiate on a hub, jointNonce and guarantorNonce
  - On agreement, they inform the hub, and invoke `VirtualFundAsLeaf`
