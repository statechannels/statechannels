import { scenarios, encode } from '../core';

import hexToBN from '../utils/hexToBN';

import TTTStateArtifact from "../../build/contracts/TicTacToeState.json";
import { ethers } from 'ethers';

jest.setTimeout(20000);

describe('TicTacToeState', () => {
  // Serializing / Deserializing
  // ===========================

  const scenario = scenarios.standard;
  const playing1 = scenario.playing1;
  const playing2 = scenario.playing2;
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.DEV_GANACHE_PORT}`);

  let stateContract;
  let networkId;

  beforeAll(async () => {
    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = TTTStateArtifact.networks[networkId].address;
    stateContract = new ethers.Contract(libraryAddress, TTTStateArtifact.abi, provider);
  });

  it("can parse aBal", async () => {
    const val = await stateContract.aResolution(encode(playing1));
    expect(val.toString()).toEqual(hexToBN(playing1.balances[0]).toString());
  });

  it("can parse bBal", async () => {
    const val = await stateContract.bResolution(encode(playing1));
    expect(val.toString()).toEqual(hexToBN(playing1.balances[1]).toString());
  });

  it("can parse stake", async () => {
    const val = await stateContract.stake(encode(playing1));
    expect(val.toString()).toEqual(hexToBN(playing1.roundBuyIn).toString());
  });

  it("can parse noughts", async () => {
    const val = await stateContract.noughts(encode(playing1));
    expect(val).toEqual(playing1.noughts);
  });

  it("can parse crosses", async () => {
    const val = await stateContract.crosses(encode(playing2));
    expect(val).toEqual(playing2.crosses);
  });
});
