import {ethers, Wallet} from 'ethers';
import _ from 'lodash';
import {signState, State, simpleEthAllocation, toNitroState} from '@statechannels/wallet-core';
import {signState as nativeSignState} from '@statechannels/native-utils';

import {participant} from '../src/wallet/__test__/fixtures/participants';
import {fastSignState} from '../src/utilities/signatures';
import {addHash} from '../src/state-utils';

async function benchmark(): Promise<void> {
  const wallet = Wallet.createRandom();
  const state: State = {
    chainId: '0x1',
    channelNonce: 0x01,
    participants: [participant({signingAddress: wallet.address})],
    outcome: simpleEthAllocation([]),
    turnNum: 1,
    isFinal: false,
    appData: '0x00',
    appDefinition: ethers.constants.AddressZero,
    challengeDuration: 0x5,
  };

  const iter = _.range(1_000);
  console.time('signState');
  iter.map(() => signState(state, wallet.privateKey));
  console.timeEnd('signState');

  const stateWithHash = addHash(state);

  console.time('fastSignState');
  const result = iter.map(async () => fastSignState(stateWithHash, wallet.privateKey));
  await Promise.all(result);
  console.timeEnd('fastSignState');

  const nitroState = toNitroState(state);

  console.time('nativeSignState');
  iter.map(() => nativeSignState(nitroState, wallet.privateKey));
  console.timeEnd('nativeSignState');
}

benchmark();
