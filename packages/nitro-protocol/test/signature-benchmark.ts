import {Wallet, constants} from 'ethers';
import {AddressZero} from 'ethers/constants';
import _ from 'lodash';

import {signState, fastSignState} from '../src/signatures';
import {State} from '../src';

async function test() {
  const wallet = Wallet.createRandom();
  const state: State = {
    channel: {chainId: '0x1', channelNonce: 0x01, participants: [wallet.address]},
    outcome: [],
    turnNum: 1,
    isFinal: false,
    appData: '0x0',
    appDefinition: AddressZero,
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

test();
