import _ from 'lodash';

import {Wallet} from '../..';
import {getPeersSetup, PeerSetup, teardownPeerSetup} from '../../../jest/with-peers-setup-teardown';
import {getWithPeersCreateChannelsArgs, waitForObjectiveStarted} from '../utils';
jest.setTimeout(60_000);
let peerSetup: PeerSetup;

beforeAll(async () => {
  peerSetup = await getPeersSetup();
});
afterAll(async () => {
  await teardownPeerSetup(peerSetup);
});

test('approving a completed objective returns immediately', async () => {
  const {peerEngines, messageService} = peerSetup;
  messageService.setLatencyOptions({dropRate: 0});

  const wallet = await Wallet.create(peerEngines.a, messageService, {
    numberOfAttempts: 100,
    initialDelay: 50,
    multiple: 1,
  });
  const walletB = await Wallet.create(peerEngines.b, messageService, {
    numberOfAttempts: 100,
    initialDelay: 50,
    multiple: 1,
  });

  const createResult = await wallet.createChannels([getWithPeersCreateChannelsArgs(peerSetup)]);

  const {objectiveId} = createResult[0];
  await waitForObjectiveStarted([objectiveId], peerEngines.b);

  const approveResult = await walletB.approveObjectives([objectiveId]);

  await expect(createResult).toBeObjectiveDoneType('Success');
  await expect(approveResult).toBeObjectiveDoneType('Success');

  const secondApprove = await walletB.approveObjectives([objectiveId]);
  await expect(secondApprove).toBeObjectiveDoneType('Success');
});
test('can approve the objective multiple times', async () => {
  const {peerEngines, messageService} = peerSetup;
  messageService.setLatencyOptions({dropRate: 0});

  const wallet = await Wallet.create(peerEngines.a, messageService, {
    numberOfAttempts: 100,
    initialDelay: 50,
    multiple: 1,
  });
  const walletB = await Wallet.create(peerEngines.b, messageService, {
    numberOfAttempts: 100,
    initialDelay: 50,
    multiple: 1,
  });

  const result = await wallet.createChannels([getWithPeersCreateChannelsArgs(peerSetup)]);
  await new Promise<void>(resolve => peerEngines.b.on('objectiveStarted', () => resolve()));
  const {objectiveId} = result[0];

  const approveCalls = 50;
  const approvePromises = _.range(approveCalls).map(() => walletB.approveObjectives([objectiveId]));

  const results = _.flatten(await Promise.all(approvePromises));

  // We expect an objective result from each call which points to the same objective
  expect(results).toHaveLength(approveCalls);
  for (const result of results) {
    expect(result.objectiveId).toEqual(objectiveId);
  }
  await expect(results).toBeObjectiveDoneType('Success');
});
