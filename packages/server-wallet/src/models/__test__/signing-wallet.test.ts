import {makeAddress} from '@statechannels/wallet-core';

import {addHash} from '../../state-utils';
import {alice} from '../../wallet/__test__/fixtures/signing-wallets';
import {createState} from '../../wallet/__test__/fixtures/states';

const signingWallet = alice();

const state = createState();
const stateWithHash = addHash(state);

const expectedResult = {
  signature:
    '0x34e314b966755fcf3ca52395c01a42ce47962dffb29224d9bc3b2c90a7a4a31c778e3abc0c4df07c7888d4e0b5bdeb9924798f722b8724626df70d4eb8331d3d1b',
  signer: makeAddress('0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf'),
};
describe('SigningWallet class', () => {
  it('signs a State', () => {
    expect(signingWallet.signState(state)).toMatchObject(expectedResult);
  });
  it('signs a StateWithHash', () => {
    expect(signingWallet.signState(stateWithHash)).toMatchObject(expectedResult);
  });
});
