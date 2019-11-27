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

## Some names of fully-determined protocols [WIP]

_This is a starting point for writing down some fully-determined protocols. More thought is probably required to figure out if they're actually fully-determined or not!_

- `OpenChannel(participants, initialBalances, nonce, appData, appDef)`
  - Each participant checks to see they don't have a nonce collision
  - Succeeds when we have a pre-fund-setup support
- `DirectFund(channelId)`
  - Abandon if channel doesn't exist or is not in pre-fund-setup
  - Fund when it's your turn.
  - Succeeds when we have a post-fund-setup round
- `TopUp(ledgerId, participant, amount, ledgerTurnNum)`
  - Do we need the turnNum?
- `PartialWithdrawal(ledgerId, participant, amount, newNonce)`
  - Will need to call `OpenChannel` to create a replacement ledger channel.
  - Probably also need `newParticipants`, to feed to `OpenChannel`, as we probably shouldn't assume that the parties will want to use the same signing keys
- `LedgerFund(channelId, ledgerId, ledgerTurnNum)`
  - Ends when in post fund
- `VirtualFund(balances, ledgerABId, jointNonce, guaranteeAHNonce, guaranteeBHNonce, ledgerAHId,....)`
  - Assumes that the `ledgerAB` already exists
  - No one participant actually needs all this information, which means there's scope to decompose this into a handful of fully-determined protocols between subsets of the participants. Conceptually it's probably useful to consider this as a protocol in its own right though. For example, these protocols could be:
    - `VirtualFundA(balances, ledgerABId, jointNonce, .. things with AH)`
    - `VirtualFundB(balances, ledgerABId, jointNonce, .. things with BH)`
    - `VirtualFundH(balances, ledgerABId, jointNonce, .. things with AH and BH)`
