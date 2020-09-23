import {ethers, Wallet} from 'ethers';
import _ from 'lodash';
import {State, simpleEthAllocation} from '@statechannels/wallet-core';

import {participant} from '../src/wallet/__test__/fixtures/participants';
import {fastSignState} from '../src/utilities/signatures';
import {WorkerManager} from '../src/utilities/workers/manager';
import {addHash} from '../src/state-utils';
import {defaultConfig} from '../src/config';

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
  const stateWithHash = addHash(state);
  const iter = _.range(10_000);
  const manager = new WorkerManager({...defaultConfig, workerThreadAmount: 2});
  // warm up the threads
  await Promise.all(
    _.range(5).map(() => manager.concurrentSignState(stateWithHash, wallet.privateKey))
  );
  console.time('fastSignState');
  const result = iter.map(async () => fastSignState(stateWithHash, wallet.privateKey));
  await Promise.all(result);
  console.timeEnd('fastSignState');

  console.time('concurrentSignState');
  const result2 = iter.map(async () =>
    manager.concurrentSignState(stateWithHash, wallet.privateKey)
  );
  await Promise.all(result2);
  console.timeEnd('concurrentSignState');

  manager.destroy();
}

benchmark();
