import {makeAddress} from '@statechannels/wallet-core';

import {addHash} from '../../state-utils';
import {alice} from '../../wallet/__test__/fixtures/signing-wallets';
import {createState} from '../../wallet/__test__/fixtures/states';

const signingWallet = alice();

const state = createState();
const stateWithHash = addHash(state);

const expectedResult = {
  signature:
    '0xc822d44e1452d7d869bbf5ae1d274d01a6f8dee9cd9e7ddb4089882b911ef9bb7c30a36208e9088f9b96748b2aa345e523693cce5fde823c8ebab92db202275c1c',
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
