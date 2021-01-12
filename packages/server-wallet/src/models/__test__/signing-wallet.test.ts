import {makeAddress} from '@statechannels/wallet-core';

import {addHash} from '../../state-utils';
import {alice} from '../../wallet/__test__/fixtures/signing-wallets';
import {createState} from '../../wallet/__test__/fixtures/states';

const signingWallet = alice();

const state = createState();
const stateWithHash = addHash(state);

const expectedResult = {
  signature:
    '0xe3d16489064184f673cbe1e3042069614972e10569422d78f8a76561600718541d3ba779b4bccba1221caec96422a4a358c2e02365cb372dcda1ef1fbb3a80b51b',
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
