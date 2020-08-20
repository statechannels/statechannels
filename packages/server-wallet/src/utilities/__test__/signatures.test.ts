import {Wallet} from 'ethers';
import {AddressZero} from '@ethersproject/constants';
import {State, simpleEthAllocation, signState} from '@statechannels/wallet-core';

import {participant} from '../../wallet/__test__/fixtures/participants';
import {fastSignState} from '../signatures';

it('sign vs fastSign', async () => {
  const wallet = Wallet.createRandom();
  const state: State = {
    chainId: '0x1',
    channelNonce: 0x01,
    participants: [participant({signingAddress: wallet.address})],
    outcome: simpleEthAllocation([]),
    turnNum: 1,
    isFinal: false,
    appData: '0x0',
    appDefinition: AddressZero,
    challengeDuration: 0x5,
  };

  const signedState = signState(state, wallet.privateKey);
  const fastSignedState = fastSignState(state, wallet.privateKey);
  expect(signedState).toEqual((await fastSignedState).signature);
});
