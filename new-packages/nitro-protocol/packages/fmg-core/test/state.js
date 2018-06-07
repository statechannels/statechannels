import { Channel } from '../src/channel';
import { State } from '../src/state';
import assertRevert from './helpers/assert-revert';
import { CountingGame } from './test-game/src/counting-game';

var StateLib = artifacts.require("./State.sol");

contract('State', (accounts) => {
  let stateLib;
  const channelNonce = 12;
  const turnNum = 15;
  const channelType = accounts[0]; // just get a valid address
  const participants = [accounts[1], accounts[2]];
  const resolution = [5, 4];
  const channel = new Channel(channelType, channelNonce, participants);
  const stateType = State.StateTypes.GAME;
  const state = new State({ channel, stateType, turnNum, resolution });
  const statePacket = state.toHex();

  before(async () => {
    stateLib = await StateLib.deployed();
  });

  it("extracts the channelType", async () => {
    let result = await stateLib.channelType.call(statePacket);
    assert.equal(channelType, result);
  });

  it("extracts the channelNonce", async () => {
    let result = await stateLib.channelNonce.call(statePacket);
    assert.equal(channelNonce, result);
  });

  it("extracts the turnNum", async () => {
    let result = await stateLib.turnNum.call(statePacket);
    assert.equal(turnNum, result);
  });

  it("extracts the number of participants", async () => {
    let n = await stateLib.numberOfParticipants.call(statePacket);
    assert.equal(n, 2);
  });

  it("extracts the participants", async () => {
    let result = await stateLib.participants.call(statePacket);
    assert.deepEqual(participants, result);
  });

  it("extracts the resolution", async () => {
    let result = await stateLib.resolution.call(statePacket);
    assert.equal(resolution[0], result[0]);
    assert.equal(resolution[1], result[1]);
  });

  it("identifies the mover based on the turnNum", async () => {
    let mover = await stateLib.mover.call(statePacket);
    // our state nonce is 15, which is odd, so it should be participant[1]
    assert.equal(mover, participants[1]);
  });

  it("identifies the indexOfMover based on the turnNum", async () => {
    let index = await stateLib.indexOfMover.call(statePacket);
    // our state nonce is 15, which is odd, so it should be participant 1
    assert.equal(index, 1);
  });

  it("can calculate the channelId", async () => {
    let chainId = await stateLib.channelId.call(statePacket);
    let localId = channel.id;

    assert.equal(chainId, localId);
  });

  it("can check if a state is signed", async () => {
    // needs to be signed by 1 as it's their move
    let [ r, s, v ] = state.sign(participants[1]);
    await stateLib.requireSignature.call(statePacket, v, r, s);
  });

  it("will revert if the wrong party signed", async () => {
    // needs to be signed by 1 as it's their move
    let [ r, s, v ] = state.sign(participants[0]);
    assertRevert(stateLib.requireSignature.call(statePacket, v, r, s));
  });

  it("can check if the state is fully signed", async() => {
    let [ r0, s0, v0 ] = state.sign(participants[0]);
    let [ r1, s1, v1 ] = state.sign(participants[1]);

    await stateLib.requireFullySigned.call(statePacket, [v0, v1], [r0, r1], [s0, s1]);
  });

  it("calculates the offset for the gameState", async() => {
    let offset = await stateLib.gameStateOffset.call(statePacket);

    // should be 128 + 2 * 64 + 96 = 352
    // TODO find better way to test this
    assert.equal(offset, 352);
  });

  it("can test if the gameAttributes are equal", async() => {
    let state1 = CountingGame.preFundSetupState({channel, resolution, turnNum, gameCounter: 0 });
    let state2 = CountingGame.preFundSetupState({channel, resolution, turnNum, gameCounter: 1 });

    await assertRevert(stateLib.gameAttributesEqual.call(state1.toHex(), state2.toHex()));
  });


});
