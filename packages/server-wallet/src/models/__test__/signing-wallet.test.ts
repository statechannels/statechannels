import {makeAddress} from '@statechannels/wallet-core';

import {addHash} from '../../state-utils';
import {alice} from '../../wallet/__test__/fixtures/signing-wallets';
import {createState} from '../../wallet/__test__/fixtures/states';

const signingWallet = alice();

const state = createState();
const stateWithHash = addHash(state);

const expectedResult = {
  signature:
    '0x9bc711f3547842642e600120cd369631b5f78ac96bc905ea63503eb6604da7c450fb117ed25110e93a3b4e124baae36f0095224ede7ef225abff93c524399d321c',
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
