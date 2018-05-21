import assertRevert from './helpers/assertRevert';
import { Position } from '../src/RockPaperScissors';

contract('RockPaperScissorsPositions', (accounts) => {

  // Serializing / Deserializing
  // ===========================

  let original = new Position(
    Position.PositionTypes.REVEAL, // positionType
    4,                             // aBal
    5,                             // bBal
    2,                             // stake
    "0xaaaaa",                     // preCommit
    Position.Plays.ROCK,           // bPlay
    Position.Plays.SCISSORS,       // aPlay
    "0xbbbbb",                     // salt
  );

  let recovered = Position.fromHex(original.toHex());

  it("can parse positionType", () => {
    assert.equal(recovered.positionType, original.positionType);
  });

  it("can parse aBal", () => {
    assert.equal(recovered.aBal, original.aBal);
  });

  it("can parse bBal", () => {
    assert.equal(recovered.bBal, original.bBal);
  });

  it("can parse stake", () => {
    assert.equal(recovered.stake, original.stake);
  });

  it("can parse preCommit", () => {
    assert.equal(recovered.preCommit, original.preCommit);
  });

  it("can parse bPlay", () => {
    assert.equal(recovered.bPlay, original.bPlay);
  });

  it("can parse aPlay", () => {
    assert.equal(recovered.aPlay, original.aPlay);
  });

  it("can parse salt", () => {
    assert.equal(recovered.salt, original.salt);
  });


  // State transitions

  it("can do state transitions", () => {
    let resting = Position.initialPosition(4, 5);

    // 1. a proposes a round
    let propose = resting.propose(2, Position.Plays.ROCK, "0xabcdef");

    // 2. b accepts
    let accept = propose.accept(Position.Plays.PAPER);

    // 3. a reveals
    let reveal = accept.reveal(Position.Plays.ROCK, "0xabcdef");

    // 4. b confirms
    let resting2 = reveal.confirm();

    // outcome
    assert.equal(resting2.aBal, 2); // a lost their stake
    assert.equal(resting2.bBal, 7); // b won it

    // alternative history
    // 2(b) b rejects
    let resting2b = propose.reject();

    // outcome
    assert.equal(resting2b.aBal, 4); // same as in the beginning
    assert.equal(resting2b.bBal, 5); // same as in the beginning
  });



});
