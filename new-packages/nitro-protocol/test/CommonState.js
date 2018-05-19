import { Channel, State } from '../src/CommonState';
import assertRevert from './helpers/assertRevert';

var CommonState = artifacts.require("./CommonState.sol");

contract('commonStateLib', (accounts) => {
  let commonStateLib;
  const CHANNEL_NONCE = 12;
  const TURN_NUM = 15;
  const CHANNEL_TYPE = accounts[0]; // just get a valid address
  const PARTICIPANTS = [accounts[1], accounts[2]];
  const GAME_STATE = "0xdeadbeef";
  const channel = new Channel(CHANNEL_TYPE, CHANNEL_NONCE, PARTICIPANTS);
  const state = new State(channel, State.StateTypes.GAME, TURN_NUM, GAME_STATE);
  const statePacket = state.toHex();

  before(async () => {
    commonStateLib = await CommonState.deployed();
  });

  it("extracts the channelType", async () => {
    let channelType = await commonStateLib.channelType.call(statePacket);
    assert.equal(channelType, CHANNEL_TYPE);
  });

  it("extracts the channelNonce", async () => {
    let channelNonce = await commonStateLib.channelNonce.call(statePacket);
    assert.equal(channelNonce, CHANNEL_NONCE);
  });

  it("extracts the turnNum", async () => {
    let turnNum = await commonStateLib.turnNum.call(statePacket);
    assert.equal(turnNum, TURN_NUM);
  });

  it("extracts the number of participants", async () => {
    let n = await commonStateLib.numberOfParticipants.call(statePacket);
    assert.equal(n, 2);
  });

  it("extracts the participants", async () => {
    let participants = await commonStateLib.participants.call(statePacket);
    assert.deepEqual(participants, PARTICIPANTS);
  });

  it("identifies the mover based on the state nonce", async () => {
    let mover = await commonStateLib.mover.call(statePacket);
    // our state nonce is 15, which is odd, so it should be participant[1]
    assert.equal(mover, PARTICIPANTS[1]);
  });

  it("identifies the indexOfMover based on the state nonce", async () => {
    let index = await commonStateLib.indexOfMover.call(statePacket);
    // our state nonce is 15, which is odd, so it should be participant 1
    assert.equal(index, 1);
  });

  it("can calculate the channelId", async () => {
    let chainId = await commonStateLib.channelId.call(statePacket);
    let localId = channel.id();

    assert.equal(chainId, localId);
  });

  it("can check if a state is signed", async () => {
    // needs to be signed by 1 as it's their move
    let [ r, s, v ] = state.sign(PARTICIPANTS[1]);
    await commonStateLib.requireSignature.call(statePacket, v, r, s);
  });

  it("will revert if the wrong party signed", async () => {
    // needs to be signed by 1 as it's their move
    let [ r, s, v ] = state.sign(PARTICIPANTS[0]);
    assertRevert(commonStateLib.requireSignature.call(statePacket, v, r, s));
  });

  it("can check if the state is fully signed", async() => {
    let [ r0, s0, v0 ] = state.sign(PARTICIPANTS[0]);
    let [ r1, s1, v1 ] = state.sign(PARTICIPANTS[1]);

    await commonStateLib.requireFullySigned.call(statePacket, [v0, v1], [r0, r1], [s0, s1]);
  });

  it("calculates the offset for the gameState", async() => {
    let offset = await commonStateLib.gameStateOffset.call(statePacket);

    // should be 192 + 2 * 32 = 256
    // TODO find better way to test this
    assert.equal(offset, 256);
  });

});
