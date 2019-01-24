import BN from 'bn.js';

import bnToHex from './bnToHex';
import hexToBN from './hexToBN';

const testEncodeDecode = (bn: BN) => {
  it(`${bn.toString(10)} is the same after encoding and decoding`, () => {
    const encoded = bnToHex(bn);
    const decoded = hexToBN(encoded);
    // We need to use JSON stringify due to the BN.js having possible different 
    // internal representations of the same number
    expect(decoded.toString(10)).toEqual(bn.toString(10));
  });
};

describe('decode', () => {
  testEncodeDecode(new BN(1));
  testEncodeDecode(new BN(9));
  testEncodeDecode(new BN(256));
});
