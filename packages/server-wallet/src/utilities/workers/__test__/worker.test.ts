import {State, simpleEthAllocation} from '@statechannels/wallet-core';
import {Wallet, ethers} from 'ethers';

import {defaultConfig} from '../../../config';
import {addHash} from '../../../state-utils';
import {participant} from '../../../wallet/__test__/fixtures/participants';
import {fastSignState} from '../../signatures';
import {WorkerManager} from '../manager';

describe('worker threads', () => {
  let manager: WorkerManager;
  beforeAll(async () => {
    manager = new WorkerManager({...defaultConfig, workerThreadAmount: 1});
  });
  afterAll(async () => {
    await manager.destroy();
  });
  it('signs a state using a worker thread', async () => {
    const {address, privateKey} = Wallet.createRandom();
    const state: State = {
      chainId: '0x1',
      channelNonce: 5,
      participants: [participant({signingAddress: address})],
      outcome: simpleEthAllocation([]),
      turnNum: 1,
      isFinal: false,
      appData: '0x00',
      appDefinition: ethers.constants.AddressZero,
      challengeDuration: 0x5,
    };

    const concurrentSignedState = await manager.concurrentSignState(addHash(state), privateKey);
    const fastSignedState = await fastSignState(addHash(state), privateKey);

    expect(fastSignedState).toMatchObject(concurrentSignedState);
  });
});
