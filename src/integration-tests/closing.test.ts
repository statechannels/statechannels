require('fake-indexeddb/auto');
import waitForExpect from 'wait-for-expect';
import {
  simpleEthAllocation,
  State,
  SignedState,
  createSignatureEntry
} from '@statechannels/wallet-core';

import {AddressZero} from '@ethersproject/constants';
import {hexZeroPad} from '@ethersproject/bytes';
import {BigNumber} from 'ethers';

import {FakeChain} from '../chain';
import {Backend} from '../store/dexie-backend';

import {Player, hookUpMessaging, generateCloseRequest} from './helpers';
import {CHALLENGE_DURATION, CHAIN_NETWORK_ID} from '../config';

jest.setTimeout(30000);

test('concludes on their turn', async () => {
  const fakeChain = new FakeChain();

  const playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain,
    new Backend()
  );
  const playerB = await Player.createPlayer(
    '0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d',
    'PlayerB',
    fakeChain,
    new Backend()
  );
  const outcome = simpleEthAllocation([
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    },
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    }
  ]);

  hookUpMessaging(playerA, playerB);
  const state: State = {
    outcome,
    turnNum: 5,
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: 0,
    appDefinition: AddressZero,
    participants: [playerA.participant, playerB.participant]
  };

  const allSignState: SignedState = {
    ...state,
    signatures: [playerA, playerB].map(({privateKey}) => createSignatureEntry(state, privateKey))
  };

  const {channelId} = await playerB.store.createEntry(allSignState);
  await playerA.store.createEntry(allSignState);

  [playerA, playerB].forEach(async player => {
    player.startAppWorkflow('running', {
      channelId,
      applicationDomain: 'localhost',
      fundingStrategy: 'Direct'
    });
    player.workflowMachine?.send('SPAWN_OBSERVERS');
    await player.store.setFunding(channelId, {type: 'Direct'});
  });

  await playerA.messagingService.receiveRequest(generateCloseRequest(channelId), 'localhost');

  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('done');
    expect(playerB.workflowState).toEqual('done');
  }, 3000);
  expect((await playerA.store.getEntry(channelId)).supported.isFinal).toBe(true);
  expect((await playerB.store.getEntry(channelId)).supported.isFinal).toBe(true);
});
