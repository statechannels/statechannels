| Max       | Width                | Table          | Width        |
| --------- | -------------------- | -------------- | ------------ |
| Open(n,S) | forceMove(m,t,s,p,S) | C(m,t+exp,s,p) | valid(s->s') |

This is the maxiumum width of a nicely formatted table in a medium post.
Using tablegenerators.com, we can generate decent looking tables in a medium post like so

```
╔═════════════╦════════════════════╦═════════════╦══════════════╗
║ State       ║ Action             ║ NextState   ║ Requirements ║
╠═════════════╬════════════════════╬═════════════╬══════════════╣
║ Open(n)     ║ forceMove(m,s,p,S) ║ Chal(m,s,p) ║ matches(S)   ║
║             ║                    ║             ╠══════════════╣
║             ║                    ║             ║ m >= n       ║
╠═════════════╬════════════════════╬═════════════╬══════════════╣
║ Chal(n,s,p) ║ refute(m,s',S)     ║ Open(n)     ║ matches(S)   ║
║             ║                    ║             ╠══════════════╣
║             ║                    ║             ║ m > n        ║
║             ║                    ║             ╠══════════════╣
║             ║                    ║             ║ p == sig(s') ║
╠═════════════╬════════════════════╬═════════════╬══════════════╣
║ Chal(n,s,p) ║ respond(s',S)      ║ Open(n+1)   ║ matches(S)   ║
║             ║                    ║             ╠══════════════╣
║             ║                    ║             ║ s->s'        ║
╠═════════════╬════════════════════╬═════════════╬══════════════╣
║ Open(n)     ║ respondAlt(S)      ║ Open(n+1)   ║ matches(S)   ║
╚═════════════╩════════════════════╩═════════════╩══════════════╝
```

# Intro

ForceMove is a state-channel protocol, designed to be a simple as possible.
A set of participants exchanging states in private, which determine some outcome of the state channel.
An adjudicator, in the form of a smart contract, enforces the outcome on a blockchain, which would typically involve some financial transaction.
As such, the participants wish for the system to protect against malicious actors that try to prevent the most fair outcome from being recorded on-chain.

At Magmo, we have spent some time specifying the ForceMove protocol in [ TLA+ ](https://en.wikipedia.org/wiki/TLA%2B), a formal specification language based on set theory.
Engineers at Amazon Web Services [have used](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf) TLA+ since 2011 when designing some of their critical systems\*.

# ForceMove overview

<!-- TODO: I'm not sure what to say in the general overview -->
<!-- Currently:
1. A ForceMove state channel is a state machine that determines the distribution of assets
2. Valid transitions, turn numbers, ordered turns
3. Adjudicator's role
4. Supported states
-->

In a ForceMove state channel, participants, privately update the state of some ledger.
The state's outcome dictates how certain assets are allocated.
The ledger may have additional state relative to the type of application the state channel is meant to support.

In this blog post, we restrict to state channels with two participants, Alice and Bob.
They update the ledger by exchanging signed copies of what they agree on as the _current state_ of the state channel.
They only sign updates to the ledger according to a pre-determined set of rules: they agree in advance to a function `validTransition(s, s')`, and a transition from `s` to `s'` is only allowed when `validTransition(s, s')` returns `true`.
For example, in a state channel used to play a game of chess, `validTransition` would only return true if the transition represents a legal chess move.
Each state includes a `turnNumber`, which must increase by one on each valid transition.
This allows for newer states to take precedence over older states.

Participants are ordered, and turns are taken in order.
In our case, for example, Alice decides what state to transition to on even turns, and Bob decides on odd turns.
We say that a state `s'` is _supported_ if there is a pair of states `(s, s')` such that

- `validTransition(s, s') == true`
- `s` and `s'` are both signed by the correct participant

In this case, `(s, s')`is called _support_ for the state`s'`.
This means that both participants have indicated their willingness to conclude the channel and distribute the assets according to`s'.outcome`.

A smart contract called the _adjudicator_ is used to manage the assets, fairly dividing the assets at the conclusion of the state channel.
A channel can conclude in two ways:

1. Both participants mutually agree on a final state, and call the `conclude` method on the adjudicator
2. One participant launches a challenge by calling `forceMove` on the adjudicator.
   The adjudicator starts a timer of a predetermined duration.
   The timer runs out before any valid response to the challenge is recorded.

In case 2, while the timer is running, any participant may attempt to clear the challenge.

The adjudicator keeps track of the turn number of the most recent supported state that it's seen, called the `turnNumRecord`.
It ignores unsupported states as well as states with a turn number less than the `turnNumRecord`.
Thus, later states always take priority over earlier states, with the intention of preventing one participant from griefing others through repeatedly launching the same challenge.
The remainder of this blog post explores various griefing attacks that we found in various versions of the ForceMove protocol.

# Modeling ForceMove

We model the adjudicator's knowledge of the state channel by a state machine with three states: `Open`, `Challenge`, and `Closed`.
The `Open` state has one parameter, the `turnNumRecord`, denoted by `n`.
The `Challenge` state has three parameters:

- `turnNumRecord`, denoted by `n`
- `challengeState`, denoted by `s`
- `challenger`, denoted by `p`

The `Closed` state is terminal, and has one parameter, the `outcomeState`, denoted by `s`.

The participants have four actions: `forceMove(n, s, p)`, `respond(s)`, `respondWithAlternativeMove(s)`, and `refute(n, s)`.
We use `respondAlt` as a short-hand for `respondWithAlternativeMove.`

The purpose of `forceMove` action is to move to a `Challenge` state.
The three remaining actions clear the challenge, moving to an `Open` state, by either

- providing a later, supported state (`respond` & `respondWithAlternativeMove`), and thus progressing the channel; or
- prove that the challenger acted in bad faith (`refute`)

In addition, the adjudicator has one further action, `timeout(S)`, where `S` is is some on-chain channel state.
The purpose of `timeout` is to close the channel by moving to the `Closed` state.
In practice, this action is implicit, and occurs with the passage of time.

## `forceMove`

To apply this action, a participant must supply a supported state `s` with turnNumber `m`.
The participant must also authorize this action by signing a special message.
Therefore, the action also includes the challenger `p`.

## `respond`

To apply this action, a participant can simply supply a correctly-signed state `s`.
This state should form a valid transition from the current `challengeState`.

## `respondAlt`

This action allows participants to provide the adjudicator an alternative set of states that also increases the `turnNumRecord`.
Participants may wish to sign multiple states with the same `turnNumRecord` for various practical purposes.
One such purpose is to allow Alice to send money to Bob while Bob is off-line, by sending multiple states at turn `n` with increasing amounts of money allocated to Bob.
Bob may then reply to whatever state is most desirable to him.

To apply `respondAlt(n)`, the participant must supply a supported state `s` with turn number `n`.
In other words, they supply a pair `(s, s')` of states, where

- `s'.turnNumber == n`
- `validTransition(s, s') == true`
- `s` and `s'` are both signed by the correct participant

## `refute(n, s)`

To apply this action, a participant can simply supply a correctly-signed state `s`.
When applying `refute(n, s)`, the turn number of the provided state `s` must be `n`.

This action is meant to prove that a participant maliciously called `forceMove` with a knowingly stale state.
The goal is to provide a state, signed by the challenger, with a greater turn number than the challenge state.
If the challenger signed such a state, the adjudicator can infer that the challenger should be aware of a later supported state, and discards the current challenge.
At this point, the adjudicator could penalize the challenger for malicious intent.

## `timeout`

Whenever the state of the channel is updated to `S`, the adjudicator makes a note of `S`, and starts a timer.
When the timer runs out, the adjudicator applies `timeout(S)`.

In practice, this transition happens implicitly: when in a `Challenge` state, the challenge expiration time is recorded in a field `finalizesAt`, and once `finalizesAt <= now`, the channel is closed.

## State Transitions: Version 1

We record the allowed state transitions from the original ForceMove protocol in the following table.
By default, any (state, action) pair not listed below does not change the state.

| State       | Action           | Next state  | Requiremeents   |
| ----------- | ---------------- | ----------- | --------------- |
| Open(n)     | forceMove(m,s,p) | Chal(m,s,p) | m >= n          |
| Chal(n,s,p) | respond(s')      | Open(n+1)   | s -> s'         |
| Chal(n,s,p) | respondAlt(n+1)  | Open(n+1)   |                 |
| Chal(n,s,p) | refute(m,s')     | Open(n)     | m > n           |
|             |                  |             | signer(p') == p |
| Chal(n,s,p) | timeout(S)       | Closed(s)   | matches(S)      |

Here, `matches(S)` indicates that the current on-chain channel state is `S`.
`Chal` is used as a short-hand for `Challenge`.
In other words, applying `timeout` to a `Challenge` state only has an effect if the state has not changed since the adjudicator timer has started.
Applying `timeout` to an open state has no effect, as the transition is not listed in this table.

We use the notation `A >> S` to denote the state resulting in applying action `A` to state `S`.

# Safety

Since the channel only closes from a `Challenge` state, and the channel only enters a challenge state when the adjudicator sees a supported state, Alice must have been, at some point in time, satisfied with any state that the channel closes with.
However, it may not close with the latest state.

Assume that Bob has become malicious, and he is willing to consume an exorbitant amount of resources to grief Alice.
Suppose the state is currently `Open(m)`, and Alice holds a supported state `s` with turn `n >= m`.
Can Alice guarantee that, in a constant number of actions, she can ensure the channel can only close with a state at turn at least `n`?
She can trivially accomplish this if she can move the state's `turnNumRecord` to be at least `n`, since the `turnNumRecord` is non-decreasing:

```
forceMove(n,s,Alice) >> Open(m) == Challenge(n,s,Alice)
```

However, in the context of the Ethereum blockchain, this is not sufficient.
Alice applies `forceMove` by calling a state-modifying function on an Ethereum smart contract in some transaction.
The transaction is not recorded immediately, and once Bob sees her transaction, he might attempt to front-run her transaction with a different action in his own transaction.
If his transaction is recorded first, it might change the state in such a way that Alice's transaction reverts.

# Version 2: Gas-optimization

The situation is worsened by an optimization we've done to save on gas fees.
A hash of the entire channel state is stored in a single `bytes32` slot on-chain.
Therefore, when applying an action, the participant must provide the current state as a part of the calldata.
If the hash of the provide state does not match the stored value, the action has no effect.

| State       | Action             | NextState   | Requirements |
| ----------- | ------------------ | ----------- | ------------ |
| Open(n)     | forceMove(m,s,p,S) | Chal(m,s,p) | matches(S)   |
|             |                    |             | m >= n       |
| Chal(n,s,p) | refute(m,s',S)     | Open(n)     | matches(S)   |
|             |                    |             | m > n        |
|             |                    |             | p == sig(s') |
| Chal(n,s,p) | respond(s',S)      | Open(n+1)   | matches(S)   |
|             |                    |             | s->s'        |
| Open(n)     | respondAlt(S)      | Open(n+1)   | matches(S)   |

```
╔═════════════╦════════════════════╦═════════════╦══════════════╗
║ State       ║ Action             ║ NextState   ║ Requirements ║
╠═════════════╬════════════════════╬═════════════╬══════════════╣
║ Open(n)     ║ forceMove(m,s,p,S) ║ Chal(m,s,p) ║ matches(S)   ║
║             ║                    ║             ╠══════════════╣
║             ║                    ║             ║ m >= n       ║
╠═════════════╬════════════════════╬═════════════╬══════════════╣
║ Chal(n,s,p) ║ refute(m,s',S)     ║ Open(n)     ║ matches(S)   ║
║             ║                    ║             ╠══════════════╣
║             ║                    ║             ║ m > n        ║
║             ║                    ║             ╠══════════════╣
║             ║                    ║             ║ p == sig(s') ║
╠═════════════╬════════════════════╬═════════════╬══════════════╣
║ Chal(n,s,p) ║ respond(s',S)      ║ Open(n+1)   ║ matches(S)   ║
║             ║                    ║             ╠══════════════╣
║             ║                    ║             ║ s->s'        ║
╠═════════════╬════════════════════╬═════════════╬══════════════╣
║ Open(n)     ║ respondAlt(S)      ║ Open(n+1)   ║ matches(S)   ║
╚═════════════╩════════════════════╩═════════════╩══════════════╝
```

```
function matches(S) {
  return keccack256(S) == currentState;
}
```

## Attack

- Suppose the channel is in `Open(k)`
- Alice wishes to apply `forceMove(n,s,Alice)`
- Bob front-runs with `forceMove(k,s',Bob)`

```
   forceMove(n,s,Alice,S) >> forceMove(k,s',Bob,S) >> Open(k)
== forceMove(n,s,Alice,S) >> Challenge(k,s',Bob)
== Challenge(k,s',Bob)
```

The problem is twofold:

- The transition `forceMove >> Challenge` is not allowed in the current version of the protocol
- Even if it were, `S` no longer matches the current state, and thus, no action would change the channel state

Bob can thus prevent the channel from progressing for time at least proportional to `n-k`.

<!-- - Note that this is not the only problem with this version of the protocol
  - TLA+ provides _one_ behaviour which violates our defined safety property
  - There is no guarantee that there are no other problems.
  - In particular, the problem at V4, the most serious problem found, is present in V1-4
- Also note that none of these problems are particularly complex
  - Indeed, we were already aware of one problem exposed by TLA+
  - Yet, TLA+ serves well as a way to force us to explicitly specify the protocol in a way that's amenable to checking for violating behaviours -->

# Version 3

While trying to model the behaviour of `respondWithAlternativeMove` in TLA+, we realized that this action had an artificial limitation.
There's no reason why it must advance the `turnNumRecord` by exactly one.
This restriction complicates state management, since the user may need to store stale states in order to use them to `respondWithAlternativeMove`.
Moreover, there's no reason why it can't be applied to an open state to increase the `turnNumRecord`.
Thus, we replaced it with the `checkpoint` action.
This allows one to only care about the latest supported state, and it can be used to protect one's assets before going offline for a period of time.

| State       | Action             | NextState   | Requirements |
| ----------- | ------------------ | ----------- | ------------ |
| Open(n)     | forceMove(m,s,p,S) | Chal(m,s,p) | matches(S)   |
|             |                    |             | m >= n       |
| Open(n,S)   | checkpoint(m,S)    | Open(m))    | matches(S)   |
|             |                    |             | m > n        |
| Chal(n,s,p) | checkpoint(m,S)    | Open(m)     | matches(S)   |
|             |                    |             | m > n        |
| Chal(n,s,p) | refute(m,s',S)     | Open(n)     | matches(S)   |
|             |                    |             | m > n        |
|             |                    |             | p == sig(s') |
| Chal(n,s,p) | respond(s',S)      | Open(n+1)   | matches(S)   |
|             |                    |             | s->s'        |

This offers Alice a new strategy, applying `checkpoint(n, t, S)`, regardless of the current state.

- Alice can call `checkpoint(n,t,S)` at any time with her most recent state,which has turn `n`
- If this transaction gets recorded,it moves to `Open(n)`
- The only valid actions from this point are
  - `checkpoint(m,S') >> Open(n) == Open(m)` for some `m > n`
  - `forceMove(m,s,p,S') >> Open(n) == Challenge(m,s,p)` for some `m > n`
- Alice is happy

## Attack

- Suppose we're in `Open(0)`
- Alice wants to apply `checkpoint(n,S)`
- Bob front-runs with `forceMove(0,s,p)`

```
   checkpoint(n,Alice,S) >> forceMove(0,s',Bob,S) >> Open(0)
== checkpoint(n,Alice,S) >> Challenge(0,s',Bob)
== Challenge(0,s',Bob)
```

No matter how the challenge is cleared, Bob can repeat this, blocking the channel for time at least proportional to `n`.

# Version 4

By exposing the `turnNumRecord` using a technique inspired from [here](https://medium.com/@novablitz/storing-structs-is-costing-you-gas-774da988895e), the participant no longer has to provide the current channel state for the `forceMove` or `checkpoint` actions.

| State       | Action           | NextState   | Requirements |
| ----------- | ---------------- | ----------- | ------------ |
| Open(n)     | forceMove(m,s,p) | Chal(m,s,p) | m >= n       |
| Open(n,S)   | checkpoint(m)    | Open(m)     | m > n        |
| Chal(n,s,p) | checkpoint(m)    | Open(m)     | m > n        |
| Chal(n,s,p) | refute(m,s',S)   | Open(n)     | matches(S)   |
|             |                  |             | m > n        |
|             |                  |             | p == sig(s') |
| Chal(n,s,p) | respond(s',S)    | Open(n+1)   | matches(S)   |
|             |                  |             | s->s'        |

In this version of the protocol, the `matches` function is implemented in Solidity as follows.

```
function matches(ChannelState memory S) public pure returns (bool) {
  // Casting from uint256 to uint160 returns the 160 least significant bits.
  // The 96 most significant bits can be used to store un-hashed data, including
  // the turnNumRecord
  return uint160(uint256(keccack256(S))) == uint160(uint256(currentState)) ;
}
```

Thus, the `forceMove` and `checkpoint` actions are always enabled, if the participant can provide a newer state than the current `turnNumRecord`.
This counters the attacks found on the previous versions, thanks to the commutativity of the `forceMove` and `checkpoint` actions:

- Suppose we're in `Open(0)`
- Alice wants to apply `checkpoint(n)`
- Bob front-run with `forceMove(0,s,p)`

```
   checkpoint(n) >> forceMove(0,s,Bob) >> Open(0)
== checkpoint(n) >> Challenge(0,s,Bob)
== Open(n)
```

However, TLA+ exposed a new attack, unknown to us at the time.

## Attack

- Suppose we're in `Open(n)`, and alice's latest state is `s`, with turn `n`.
- Alice wants to apply `forceMove(n,s,Alice)`
- Bob front-runs with `forceMove(n,s,Bob)`

```
   forceMove(n,s,Alice) >> forceMove(n,s,Bob) >> Open(n)
== forceMove(n,s,Alice) >> Challenge(n,s,Bob)
== Challenge(n,s,Bob)
```

- Alice has no signed state later than `n`, so she cannot perform any action.
- Bob can sign any state `s'` with her turn number, and she calls `refute(m,s',S)`.

```
refute(m,s',S) >> Challenge(n,s,Bob) == Open(n)
```

- The state has returns to `Open(n)`.

By repeating this attack, Bob can prevent the channel from closing indefinitely.
While there are techniques that can block this attack, such as storing who has challenged so far with the current `turnNumRecord`, we decided to forgo the `refute` action altogether until we have a clear application for it.

Note that this attack was present in all of the above versions.
Prior to writing specs in TLA+, we were more or less aware of the previous attacks, but we had not thought about this simple attack.

# Version 5

This leaves us with the current version of the protocol:

| State       | Action           | NextState   | Requirements |
| ----------- | ---------------- | ----------- | ------------ |
| Open(n)     | forceMove(m,s,p) | Chal(m,s,p) | m >= n       |
| Open(n,S)   | checkpoint(m)    | Open(m))    | m > n        |
| Chal(n,s,p) | checkpoint(m)    | Open(m)     | m > n        |
| Chal(n,s,p) | respond(s',S)    | Open(n+1)   | matches(S)   |
|             |                  |             | s->s'        |

With this final protocol, when Alice has a state `s` of turn `n`, she has two strategies to protect her assets.

If she wishes to force Bob to move, she applies `forceMove(n, s, Alice)`.
When her transaction is proccessed, we can partition the possible states into four cases:

1. `Open(m)`
   a. `m <= n`
   b. `m > n`
2. `Challenge(m, s', p')`
   a. `m < n`
   b. `m >= n`

In cases 1a & 2a, her transaction succeeds, and the state changes to `Challenge(n, s, Alice)`.
In cases 1b & 2b, her transaction fails, but she has seen a supported state `s'` that trumps `s`, which was her goal.

If she wishes to protect her assets before going offline, she applies `checkpoint(n)`.
When her transaction is proccessed, we can partition the possible states into four cases:

1. `Open(m)`
   a. `m < n`
   b. `m >= n`
2. `Challenge(m,s,p)`
   a. `m < n`
   b. `m >= n`

In cases 1a and 2a, her transaction succeeds, and the state changes to `Open(n)`.
In cases 1b and 2b, her transaction fails, but the `turnNumRecord` is already at least `n`.
Therefore, all cases, Alice now knows that the channel can only close in an outcome state she supported, with turn number at least `n`.

With both of these strategies, Alice knows that, provided she provides correct calldata to the smart contract functions, she will accomplish her goal.
Front-running attacks have no bearing on the safety of her funds.
