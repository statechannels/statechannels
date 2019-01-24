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
  it('encodes Propose', () => {
    expect(encode(scenarios.standard.propose)).toEqual(scenarios.standard.proposeHex);
  });
  it('encodes Accept', () => {
    expect(encode(scenarios.standard.accept)).toEqual(scenarios.standard.acceptHex);
  });
  it('encodes Reveal', () => {
    expect(encode(scenarios.standard.reveal)).toEqual(scenarios.standard.revealHex);
  });
  it('encodes Resting', () => {
    expect(encode(scenarios.aResignsAfterOneRound.resting)).toEqual(scenarios.aResignsAfterOneRound.restingHex);
  });
  it('encodes Conclude', () => {
    expect(encode(scenarios.aResignsAfterOneRound.conclude)).toEqual(scenarios.aResignsAfterOneRound.concludeHex);
  });
});
