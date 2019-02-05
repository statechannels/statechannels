import { scenarios, encode } from '../core';
import { ethers } from 'ethers';
import TTTGameArtifact from "../../build/contracts/TicTacToeGame.json";

jest.setTimeout(20000);


describe('TicTacToeGame', () => {
  let tttContract;  
  let playing1;
  let playing2;
  let propose;
  let reject; 
  let rest; 
  let cheatreject;
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.DEV_GANACHE_PORT}`);

  beforeEach(async () => {
    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = TTTGameArtifact.networks[networkId].address;

    tttContract = new ethers.Contract(libraryAddress, TTTGameArtifact.abi, provider);

    const scenario = scenarios.build(libraryAddress, "0xa", "0xb");
    playing1 = scenario.playing1;
    playing2 = scenario.playing2;

    const scenario2 = scenarios.aRejectsGame;
    rest = scenario2.rest;
    propose = scenario2.propose;
    reject = scenario2.reject;

    cheatreject = scenario2.cheatreject;
  });

  const validTransition = async (state1, state2) => {
    return await tttContract.validTransition(encode(state1), encode(state2));
  };

  // Transition function tests
  // ========================

  it("allows REST -> XPLAYING", async () => {
    expect(validTransition(rest, propose)).toBeTruthy();
  });

  it("allows XPLAYING -> REST (game rejected)", async () => {
    expect(validTransition(propose, reject)).toBeTruthy();
  });

  it("disallows XPLAYING -> REST (game rejected but with incorrect balances)", async () => {
    await expect(tttContract.validTransition(encode(propose), encode(cheatreject))).rejects.toThrowError();
  });

  it("allows XPLAYING -> OPLAYING", async () => {
    expect(validTransition(playing1, playing2)).toBeTruthy();
  });
});
