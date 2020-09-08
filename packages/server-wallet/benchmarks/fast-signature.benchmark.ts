import {Wallet} from 'ethers';
import {AddressZero} from '@ethersproject/constants';
import _ from 'lodash';
import {signState, State, simpleEthAllocation} from '@statechannels/wallet-core';

import {participant} from '../src/wallet/__test__/fixtures/participants';
import {fastSignState} from '../src/utilities/signatures';

async function benchmark(): Promise<void> {
  const wallet = Wallet.createRandom();
  const state: State = {
    chainId: '0x1',
    channelNonce: 0x01,
    participants: [participant({signingAddress: wallet.address})],
    outcome: simpleEthAllocation([]),
    turnNum: 1,
    isFinal: false,
    appData: '0x0',
    appDefinition: ethers.constants.AddressZero,
    challengeDuration: 0x5,
  };

  const iter = _.range(1_000);
  console.time('signState');
  iter.map(() => signState(state, wallet.privateKey));
  console.timeEnd('signState');

  console.time('fastSignState');
  const result = iter.map(async () => fastSignState(state, wallet.privateKey));
  await Promise.all(result);
  console.timeEnd('fastSignState');
}

benchmark();
