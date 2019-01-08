import { scenarios } from '../../../core';
import { signPositionHex, validSignature, signVerificationData } from '../signing-utils';

const s = scenarios.standard;

const itSigns = (name, positionHex, key, signature) => {
  it(`calculates the signature of ${name}`, () => {
    expect(signPositionHex(positionHex, key)).toEqual(signature);
  });
};

describe('signPositionHex', () => {
  itSigns('PreFundSetupA', s.preFundSetupAHex, s.asPrivateKey, s.preFundSetupASig);
  itSigns('PreFundSetupB', s.preFundSetupBHex, s.bsPrivateKey, s.preFundSetupBSig);
  itSigns('Propose', s.proposeHex, s.asPrivateKey, s.proposeSig);
  itSigns('Accept', s.acceptHex, s.bsPrivateKey, s.acceptSig);
});

const itChecksSig = (name, positionHex, signature, address) => {
  it(`checks the signature of ${name}`, () => {
    expect(validSignature(positionHex, signature, address)).toEqual(true);
  });
};

describe('validSignature', () => {
  itChecksSig('PreFundSetupA', s.preFundSetupAHex, s.preFundSetupASig, s.asAddress);
  itChecksSig('PreFundSetupB', s.preFundSetupBHex, s.preFundSetupBSig, s.bsAddress);
  itChecksSig('Propose', s.proposeHex, s.proposeSig, s.asAddress);
  itChecksSig('Accept', s.acceptHex, s.acceptSig, s.bsAddress);
});

it('should sign verification data', () => {
  const signature = signVerificationData(s.asAddress, s.asAddress, s.channelId, s.asPrivateKey);
  expect(signature).toEqual('0x01fc4122f240d67822f54fe21095bd3577000603fb3661c7f68cf3ebb5cef39c3e1b5b3460e3240082eba63dc5ef61ab59ffc625af71378b4137b1f23cc708101c');
});