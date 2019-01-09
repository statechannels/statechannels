import * as scenarios from '../test-scenarios';
import encode from '../encode';

describe('decode', () => {
  it('encodes PreFundSetupA', () => {
    expect(encode(scenarios.standard.preFundSetupA)).toEqual(scenarios.standard.preFundSetupAHex);
  });
  it('encodes PreFundSetupB', () => {
    expect(encode(scenarios.standard.preFundSetupB)).toEqual(scenarios.standard.preFundSetupBHex);
  });
  it('encodes PostFundSetupA', () => {
    expect(encode(scenarios.standard.postFundSetupA)).toEqual(scenarios.standard.postFundSetupAHex);
  });
  it('encodes PostFundSetupB', () => {
    expect(encode(scenarios.standard.postFundSetupB)).toEqual(scenarios.standard.postFundSetupBHex);
  });
  it('encodes a full game ending in a tie', () => {
    expect(encode(scenarios.standard.playing1)).toEqual(scenarios.standard.playing1Hex);
    expect(encode(scenarios.standard.playing2)).toEqual(scenarios.standard.playing2Hex);
    expect(encode(scenarios.standard.playing3)).toEqual(scenarios.standard.playing3Hex);
    expect(encode(scenarios.standard.playing4)).toEqual(scenarios.standard.playing4Hex);
    expect(encode(scenarios.standard.playing5)).toEqual(scenarios.standard.playing5Hex);
    expect(encode(scenarios.standard.playing6)).toEqual(scenarios.standard.playing6Hex);
    expect(encode(scenarios.standard.playing7)).toEqual(scenarios.standard.playing7Hex);
    expect(encode(scenarios.standard.playing8)).toEqual(scenarios.standard.playing8Hex);
    expect(encode(scenarios.standard.draw)).toEqual(scenarios.standard.drawHex);
    expect(encode(scenarios.standard.resting)).toEqual(scenarios.standard.restingHex);
  });

  it('encodes Draw', () => {
    expect(encode(scenarios.standard.draw)).toEqual(scenarios.standard.drawHex);
  });

  it('encodes Victory', () => {
    expect(encode(scenarios.noughtsVictory.victory)).toEqual(scenarios.noughtsVictory.victoryHex);
  });

  it('encodes resigning Conclude', () => {
    expect(encode(scenarios.aResignsAfterOneRound.conclude)).toEqual(scenarios.aResignsAfterOneRound.concludeHex);
  });

});
