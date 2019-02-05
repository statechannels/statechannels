import { ethers } from 'ethers';
import TTTHelpersArtifact from "../../build/contracts/TicTacToeHelpers.json";

jest.setTimeout(20000);


describe('TicTacToeHelpers', () => {
  let tttHelpersContract;
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.DEV_GANACHE_PORT}`);

  beforeEach(async () => {
    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = TTTHelpersArtifact.networks[networkId].address;

    tttHelpersContract = new ethers.Contract(libraryAddress, TTTHelpersArtifact.abi, provider);
  });

  it("Approves a winning 'marks' integer after 3 marks", async () => {
      expect( await tttHelpersContract.hasWon(0b111000000)).toBeTruthy();
    });

  it("Approves a winning 'marks' integer after 4 marks", async () => {
    expect( await tttHelpersContract.hasWon(0b111000010)).toBeTruthy();
  });

  it("Approves a winning 'marks' integer after 5 marks", async () => {
    expect( await tttHelpersContract.hasWon(0b111110000)).toBeTruthy();
  });

  it("Rejects a non-winning 'marks' integer after 3 marks", async () => {
    expect( await tttHelpersContract.hasWon(0b110010000)).toBeFalsy();
  });

  it("Approves disjoint noughts and crosses", async () => {
    expect( await tttHelpersContract.areDisjoint(0b000000111,0b111000000)).toBeTruthy();
  });

  it("Rejects overlapping noughts and crosses", async () => {
    expect( await tttHelpersContract.areDisjoint(0b000000001,0b100000001)).toBeFalsy();
  });

  it("Approves valid move", async () => {
    expect( await tttHelpersContract.madeStrictlyOneMark(0b000111000,0b000110000)).toBeTruthy();
  });

  it("Rejects deletion of marks", async () => {
    expect( await tttHelpersContract.madeStrictlyOneMark(0b100000001,0b110000000)).toBeFalsy();
  });

  it("Rejects double move", async () => {
    expect( await tttHelpersContract.madeStrictlyOneMark(0b1100000011,0b110000000)).toBeFalsy();
  });

  it("Recognizes a draw", async () => {
    expect( await tttHelpersContract.isDraw(0b101100011,0b010011100)).toBeTruthy();
  });

  it("Recognizes a draw (that should be a win for crosses)", async () => {
    expect( await tttHelpersContract.isDraw(0b001101110,0b110010001)).toBeTruthy();
  });

  it("Rejects a non-draw", async () => {
    expect( await tttHelpersContract.isDraw(0b001101110,0b110010000)).toBeFalsy();
  });

  it("can count the ones in a binary number", async () => {
    expect( await tttHelpersContract.popCount(0b111000000)).toBe(3);
  });

  it("can count the ones in a binary number", async () => {
    expect( await tttHelpersContract.popCount(0b111000010)).toBe(4);
  });
});
