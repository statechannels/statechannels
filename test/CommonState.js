import { pack, channelId, ecSignState } from '../src/CommonState';
import assertRevert from './helpers/assertRevert';

var CommonState = artifacts.require("./CommonState.sol");

contract('commonStateLib', (accounts) => {
  let commonStateLib;
  let incGame;
  let state;
  const CHANNEL_NONCE = 12;
  const STATE_NONCE = 15;
  const CHANNEL_TYPE = accounts[0]; // just get a valid address
  const PARTICIPANTS = [accounts[1], accounts[2]];
  const GAME_STATE = "0xdeadbeef";

  before(async () => {
    commonStateLib = await CommonState.deployed();
    state = pack(
      CHANNEL_TYPE,
      CHANNEL_NONCE,
      STATE_NONCE,
      PARTICIPANTS[0],
      PARTICIPANTS[1],
      GAME_STATE
    );
  });
  
  it("extracts the channelType", async () => {
    let channelType = await commonStateLib.channelType.call(state);
    assert.equal(channelType, CHANNEL_TYPE);
  });

  it("extracts the channelNonce", async () => {
    let channelNonce = await commonStateLib.channelNonce.call(state);
    assert.equal(channelNonce, CHANNEL_NONCE);
  });

  it("extracts the stateNonce", async () => {
    let stateNonce = await commonStateLib.stateNonce.call(state);
    assert.equal(stateNonce, STATE_NONCE);
  });

  it("extracts the number of participants", async () => {
    let n = await commonStateLib.numberOfParticipants.call(state);
    assert.equal(n, 2);
  });

  it("extracts the participants", async () => {
    let participants = await commonStateLib.participants.call(state);
    assert.deepEqual(participants, PARTICIPANTS);
  });

  it("identifies the mover based on the state nonce", async () => {
    let mover = await commonStateLib.mover.call(state);
    // our state nonce is 15, which is odd, so it should be participant[1]
    assert.equal(mover, PARTICIPANTS[1]);
  });

  it("identifies the indexOfMover based on the state nonce", async () => {
    let index = await commonStateLib.indexOfMover.call(state);
    // our state nonce is 15, which is odd, so it should be participant 1
    assert.equal(index, 1);
  });

  it("can calculate the channelId", async () => {
    let chainId = await commonStateLib.channelId.call(state);
    let localId = channelId(CHANNEL_TYPE, CHANNEL_NONCE, PARTICIPANTS);

    assert.equal(chainId, localId);
  });

  it("can check if a state is signed", async () => {
    // needs to be signed by 1 as it's their move
    let [ r, s, v ] = ecSignState(state, PARTICIPANTS[1]);
    await commonStateLib.requireSignature.call(state, v, r, s);
  });

  it("will revert if the wrong party signed", async () => {
    // needs to be signed by 1 as it's their move
    let [ r, s, v ] = ecSignState(state, PARTICIPANTS[0]);
    assertRevert(commonStateLib.requireSignature.call(state, v, r, s));
  });

  it("can check if the state is fully signed", async() => {
    let [ r0, s0, v0 ] = ecSignState(state, PARTICIPANTS[0]);
    let [ r1, s1, v1 ] = ecSignState(state, PARTICIPANTS[1]);

    await commonStateLib.requireFullySigned.call(state, [v0, v1], [r0, r1], [s0, s1]);
  });

  it("calculates the offset for the gameState", async() => {
    let offset = await commonStateLib.gameStateOffset.call(state);

    // should be 192 + 2 * 32 = 256
    // TODO find better way to test this
    assert.equal(offset, 256);
  });

});
