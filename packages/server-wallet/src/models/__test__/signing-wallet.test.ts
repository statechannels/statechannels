import {makeAddress} from '@statechannels/wallet-core';

import {addHash} from '../../state-utils';
import {alice} from '../../wallet/__test__/fixtures/signing-wallets';
import {createState} from '../../wallet/__test__/fixtures/states';

const signingWallet = alice();

const state = createState();
const stateWithHash = addHash(state);

const expectedResult = {
  signature:
    '0x6b54b1db57318e712c54c128fdc329512b4c0cad8991990e1fb322ea44af04c849ab622289c3e83363b9cfd733ab7e6b07f11e254f49a5f64804e540ecdc6e131b',
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
