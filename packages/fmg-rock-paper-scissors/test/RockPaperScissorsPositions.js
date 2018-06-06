import assertRevert from './helpers/assertRevert';
import { RpsGame } from '../src/RockPaperScissors';
import { Channel } from '../src/CommonState';

var RpsStateContract = artifacts.require("./RockPaperScissorsState.sol");

contract('RockPaperScissorsPositions', (accounts) => {

  const preCommit = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const salt = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const turnNum = 4;
  const resolution = [4, 5];
  const stake = 2;
  const aPlay = RpsGame.Plays.ROCK;
  const bPlay = RpsGame.Plays.SCISSORS;

  // Serializing / Deserializing
  // ===========================

  let channel = new Channel("0xdeadbeef", 0, [accounts[0], accounts[1]]);
  let original = RpsGame.revealState({
    channel,
    turnNum,
    resolution,
    stake,
    preCommit,
    aPlay,
    bPlay,
    salt,
  });
  // let recovered = Position.fromHex(original.toHex());
  let stateContract;

  before( async () => {
    stateContract = await RpsStateContract.deployed();
  });

  xit("can parse positionType", async () => {
    // assert.equal(recovered.positionType, original.positionType);
    assert.equal(await stateContract.positionType(original.toHex()), original.positionType);
  });

  it("can parse aBal", async () => {
    assert.equal(await stateContract.aResolution(original.toHex()), resolution[0]);
  });

  it("can parse bBal", async () => {
    // assert.equal(recovered.bBal, original.bBal);
    assert.equal(await stateContract.bResolution(original.toHex()), resolution[1]);
  });

  it("can parse stake", async () => {
    // assert.equal(recovered.stake, original.stake);
    assert.equal(await stateContract.stake(original.toHex()), stake);
  });

  it("can parse preCommit", async () => {
    // assert.equal(recovered.preCommit, original.preCommit);
    assert.equal(await stateContract.preCommit(original.toHex()), preCommit);
  });

  xit("can parse bPlay", async () => {
    // assert.equal(recovered.bPlay, original.bPlay);
    assert.equal(await stateContract.bPlay.call(original.toHex()), bPlay);
  });

  xit("can parse aPlay", async () => {
    // assert.equal(recovered.aPlay, original.aPlay);
    assert.equal(await stateContract.aPlay.call(original.toHex()), aPlay);
  });

  it("can parse salt", async () => {
    // assert.equal(recovered.salt, original.salt);
    assert.equal(await stateContract.salt(original.toHex()), salt);
  });


  // State transitions

  it.skip("can do state transitions", () => {
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
