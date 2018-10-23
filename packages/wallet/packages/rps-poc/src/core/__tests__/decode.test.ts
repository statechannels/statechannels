import * as scenarios from '../test-scenarios';
import encode from '../encode';
import decode from '../decode';
import { Position } from '../positions';

const testEncodeDecode = (position: Position) => {
  it(`${position.name} is the same after encoding and decoding`, () => {
    const encoded = encode(position);
    const decoded = decode(encoded);
    // We need to use JSON stringify due to the BN.js having possible different 
    // internal representations of the same number
    expect(JSON.stringify(decoded)).toEqual(JSON.stringify(position));
  });
};

describe('decode', () => {
  testEncodeDecode(scenarios.standard.preFundSetupA);
  testEncodeDecode(scenarios.standard.preFundSetupB);
  testEncodeDecode(scenarios.standard.postFundSetupA);
  testEncodeDecode(scenarios.standard.postFundSetupB);
  testEncodeDecode(scenarios.standard.propose);
  testEncodeDecode(scenarios.standard.accept);
  testEncodeDecode(scenarios.standard.reveal);
  testEncodeDecode(scenarios.aResignsAfterOneRound.resting);
  testEncodeDecode(scenarios.aResignsAfterOneRound.conclude);
  testEncodeDecode(scenarios.aResignsAfterOneRound.conclude2);
});
