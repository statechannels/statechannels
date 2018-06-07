# Force-move Games: Rock Paper Scissors

This package contains a sample implementation of a rock-paper-scissors (RPS) game.

The package defines two objects:
1. `RockPaperScissorsState` extends the core `State` contract, defining the attributes needed to
describe a "move".
2. `RockPaperScissorsGame` implementats the `validTransition` function, which outlines the rules that players have to follow during gameplay.

The real-world game involves two players simultaneously picking a move.
In our force-move game implementation, we will use a commit-reveal strategy to
simulate this, where one player commits to a value beforehand and then only
reveals their choice once the other player's choice is known.

In our implementation, each round of the game will pass through four different
stages: `Start`, `RoundProposed`, `RoundAccepted`, and `Reveal`.
We describe below how a client could control the flow of states that could be exchanged during a round of rock-paper-scissors played between Alice and Bob.

![Alt text](assets/rock-paper-scissors.png?raw=true "Title")
In each state `aBal` and `bBal` represent Alice and Bob's current balances in the game respectively.
The dotted lines represent the _resolution_ of the game if it were to conclude from the given state -- that is, what the game rules considers a fair payout to each player.

The states we show in the diagram are slightly simplified.
In particular, we omit the _framework attributes_ implemented by the core state contract.
The client's game library should automatically take care of these -- if they aren't updated correctly, the other player could enforce the game rules with the rules contained in the on-chain smart-contract.

The game requires some setup, as outlined in the simple adjudicator's readme.
For simplicty we assume that we start in a position where Bob has just signed and sent
a state `state0A` to Alice as `message0B`.
```javascript
// In Alice's client, Alice holds message0B, which satisfies:
assert(message0B.signedBy(bobAddress));
assert(message0B.state.positionType == RPS.Start);
assert(message0B.state.aBal == 5);
assert(message0B.state.bBal == 4);
```
It could be that Alice and Bob have just entered the game from the setup phase,
which we'll cover later, or they might have just finished a previous round.

Alics kicks off a round by moving to a `RoundProposed` state.
In doing this, she chooses a `stake` that they're each going to contribute and
adjusts their totals accordingly.
She also provides the `preCommit`, which she calculates by hashing her
choice, `rock`, with a random string, `xyz`:

```javascript
// In Alice's client:

let move0B = RPS.fromMessage(message0B);
let gameAttributes = {
  positionType: RPS.RoundProposed,
  aBal: 4,
  bBal: 3,
  stake: 1,
  preCommit: h('rock', 'xyz')
};
let state1A = RPS.Game({ ...move0B, ...gameAttributes});
let message1A = StateWalletA.sign(state1A);

// Alice ---> message1A ----> Bob
```

Bob then decides whether to accept the round or not.
If he didn't want to accept, he would sign and send back the same `Start` state
(apart from an increased `turnNum`) as he sent in the beginning.
If he does want to accept, he signs the `RPS.RoundAccepted` state, providing his
choice -- in this case `scissors`:

```javascript
// In Bob's client:
StateWalletB.receive(message1A);
let move1A = RPS.fromMessage(message1A);
let gameAttributes = {
  positionType: RPS.RoundAccepted,
  aBal: 4,
  bBal: 3,
  stake: 1,
  preCommit: h('rock', 'xyz'),
  bPlay: 'scissors'
};
let state2B = RPS.Game({ ...move1A, ...gameAttributes});
let message2B = StateWalletB.sign(state1B);

// b ---> message2B ----> a
```

Notice that, even though Alice appears to be winning at this point, if Bob were to force-move Alice into responding to `message2B`, and Alice fails to respond in time, Bob would take the stake.
This is the only fair distribution, as from the world's point of view -- ie. anyone but Alice -- this case is indistinguishable from Alice deliberately stalling, knowing that she's lost.

The next step is for Alice to reveal her value.
To do this she signs the `RPS.Reveal` state, which reveals her choice.
She also provides the `salt` used in the pre-commit, so that Bob can
verify that she hasn't changed her choice:

```javascript

let move2B = RPS.fromMessage(message2B);
let gameAttributes = {
  positionType: RPS.Reveal,
  aBal: 4,
  bBal: 3,
  stake: 1,
  aPlay: 'rock',
  salt: 'xyz',
  preCommit: h('rock', 'xyz'),
  bPlay: 'scissors'
};
let state3A = RPS.Game({ ...move2B, ...gameAttributes});
let message3A = StateWalletA.sign(state3A);

// Alice ---> message3A ----> Bob
```

Bob then completes the round by signing the `Start` state.
In doing this he updates the totals to reflect the fact that Alice won the last
round:

```javascript
// In Bob's client:
StateWalletB.receive(message3A);
let move3A = RPS.fromMessage(message3A);
let gameAttributes = {
  positionType: RPS.Start,
  aBal: 6,
  bBal: 3,
};
let state4B = RPS.Game({ ...move3A, gameAttributes});
let message4B = StateWalletB.sign(state3B);

// Bob ---> message4B ----> Alice
```

Now they are back in the `Start` state, Alice is free to propose another
round if she wishes.
