import _ from 'lodash';

import {
  teardownPeerSetup,
  setupPeerWallets,
  PeerSetupWithWallets,
} from '../../../jest/with-peers-setup-teardown';
import {TestMessageService} from '../../message-service/test-message-service';
import {getWithPeersCreateChannelsArgs, waitForObjectiveEvent} from '../utils';
jest.setTimeout(60_000);
let peerSetup: PeerSetupWithWallets;

beforeAll(async () => {
  peerSetup = await setupPeerWallets();
});
afterAll(async () => {
  await teardownPeerSetup(peerSetup);
});

test('approving a completed objective returns immediately', async () => {
  const {peerEngines, peerWallets} = peerSetup;
  TestMessageService.setLatencyOptions(peerWallets, {dropRate: 0});

  const createResult = await peerWallets.a.createChannels([
    getWithPeersCreateChannelsArgs(peerSetup),
  ]);

  const {objectiveId} = createResult[0];
  await waitForObjectiveEvent([objectiveId], 'objectiveStarted', peerEngines.b);

  const approveResult = await peerWallets.b.approveObjectives([objectiveId]);

  await expect(createResult).toBeObjectiveDoneType('Success');
  await expect(approveResult).toBeObjectiveDoneType('Success');

  const secondApprove = await peerWallets.b.approveObjectives([objectiveId]);
  await expect(secondApprove).toBeObjectiveDoneType('Success');
});

test('can approve the objective multiple times', async () => {
  const {peerEngines, peerWallets} = peerSetup;

  const result = await peerWallets.a.createChannels([getWithPeersCreateChannelsArgs(peerSetup)]);
  const {objectiveId} = result[0];
  await waitForObjectiveEvent([objectiveId], 'objectiveStarted', peerEngines.b);

  TestMessageService.freeze(peerWallets);
  const firstResult = await peerWallets.b.approveObjectives([objectiveId]);
  const secondResult = await peerWallets.b.approveObjectives([objectiveId]);
  // The objectives should be approved but should not have progressed further
  // due to the message service being frozen
  expect(firstResult[0].currentStatus).toBe('approved');
  expect(secondResult[0].currentStatus).toBe('approved');

  TestMessageService.unfreeze(peerWallets);

  await expect(firstResult).toBeObjectiveDoneType('Success');
  await expect(secondResult).toBeObjectiveDoneType('Success');
});
