import { scenarios, encode } from '../core';

import hexToBN from '../utils/hexToBN';

import rpsStateArtifact from '../../build/contracts/RockPaperScissorsState.json';
import { ethers } from 'ethers';

describe('RockPaperScissorsState', () => {

  const scenario = scenarios.standard;
  const propose = scenario.propose;
  const reveal = scenario.reveal;
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.DEV_GANACHE_PORT}`);
  let stateContract;
  let networkId;
  beforeEach(async () => {

    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = rpsStateArtifact.networks[networkId].address;

    stateContract = new ethers.Contract(libraryAddress, rpsStateArtifact.abi, provider);
  });


  it("can parse aBal", async () => {
    const val = await stateContract.aResolution(encode(reveal));
    expect(val.toString()).toEqual(hexToBN(reveal.balances[0]).toString());
  });

  it("can parse bBal", async () => {
    const val = await stateContract.bResolution(encode(reveal));
    expect(val.toString()).toEqual(hexToBN(reveal.balances[1]).toString());
  });

  it("can parse stake", async () => {
    const val = await stateContract.stake(encode(reveal));
    expect(val.toString()).toEqual(hexToBN(reveal.roundBuyIn).toString());
  });

  it("can parse preCommit", async () => {
    expect(await stateContract.preCommit(encode(propose))).toEqual(propose.preCommit);
  });

  // skipped because web3 can't cope with the Play object that is returned
  it.skip("can parse bPlay", async () => {
    expect(await stateContract.bPlay(encode(reveal))).toEqual(reveal.bsMove);
  });

  // skipped because web3 can't cope with the Play object that is returned
  it.skip("can parse aPlay", async () => {
    expect(await stateContract.aPlay(encode(reveal))).toEqual(reveal.asMove);
  });

  it("can parse salt", async () => {
    expect(await stateContract.salt(encode(reveal))).toEqual(reveal.salt);
  });

});
