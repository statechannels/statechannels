# Simple Adjudicator

The simple adjudicator is the on-chain contract that is responsible for holding the funds deposited
by the parties and for managing on-chain challenges.

The simple adjudicator can only support a single state channel game, meaning that a new on-chain
deposit is required for each game played by the participants. We provide this adjudicator
as a usable but inefficient proof-of-principal. In the long term, we would want to see
adjudicators that support ledger channels and virtual channels.

### Usage

Here we go over some example happy-case useage for the simple adjudicator. There ~are~ will soon be more
comprehensive examples in the tests.

Note: In what follows we interact with a `StateWallet` object. This is for illustration
purposes only - the `StateWallet` isn't written yet. Ultimately it will be responsible for
signing and storing states, as well as making sure that the state transitions are allowed
according to the rules of the game being played.

#### Pre-funding setup

Before putting any funds into the adjudicator both A and B need to be holding signed agreements
of their intent to start the game with pre-agreed balances. These agreements give them the
capability (through a force-move) to recover any funds that they have deposited in the case
that the opponent stalls.

```javascript
import { Channel } from 'fmg-core';
import { MyGame } from 'my-game';

// the contract describing MyGame should be installed on-chain in a single global location
let myGameContract = MyGameContract.deployed();
// participants are defined by their addresses
let participants = [addressOfA, addressOfB];
// choose the channelNonce to make (myGameContract.address, channelNonce, participants) unique
let channelNonce = 12345678; 
// starting amounts
let aBal = Number(web3.toWei(6, "ether"));
let bBal = Number(web3.toWei(4, "ether"));
let resolution = [aBal, bBal];

// In a's client:
let startPos = { /* ... */ } // the game state that a wants to start in
let channel = new Channel(myGameContract.address, channelNonce, participants);
let state0A = MyGame.preFundSetup({ channel, turnNum: 0, stateCount: 0, resolution, startPos });
let message0A = StateWalletA.sign(state0A);

// a ---> message0A ----> b

// In b's client:
StateWalletB.receive(message0A);
let move0A = MyGame.fromMessage(message0A);
let state1B = MyGame.preFundSetup({ ...move0A, turnNum: 1, stateCount: 1 });
let message1B = StateWalletB.sign(state1B);

// b ---> message1B ----> a

// In a's client:
StateWalletA.receive(message1B);
```
#### Funding the channel with the simple adjudicator

At this point both players hold two signed messages signifying their agreement to commence the game in the specified start state. They can now fund the project:

```javascript
// In a's client:
let adj = await SimpleAdjudicator.new(channel.id).address; // deploy adjudicator with channelId
await web3.eth.sendTransaction({ to: adj, value: aBal }); // fund contract

// a ---> adj ---> b

// In b's client:
assert(Number(web3.eth.getBalance(adj)) == aBal); // check that a deposited the right amount
await web3.eth.sendTransaction({ to: adj, value: bBal }); // fund contract

// b ----> "done" ---> a

// In a's client:
assert(Number(web3.eth.getBalance(adj)) == aBal + bBal); // check that a deposited the right amount

let state2A = MyGame.postFundSetup({ channel, turnNum: 2, stateCount: 0, resolution, startPos });
let message2A = StateWalletA.sign(state2A);

// a ---> message2A ---> b

// In b's client
StateWalletB.receive(message2A);
let state3B = MyGame.postFundSetup({ channel, turnNum: 3, stateCount: 1, resolution, startPos });
let message3B = StateWalletB.sign(state3B);
```

At this point, the adjudicator is funded and both participants have confirmed. They are now
free to proceed with the game, starting from the agreed starting position. 