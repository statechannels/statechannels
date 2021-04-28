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
const DEFAULT__RETRY_OPTIONS = {numberOfAttempts: 100, initialDelay: 50, multiple: 1};

test('approving a completed objective returns immediately', async () => {
  const {peerEngines, messageService} = peerSetup;
  messageService.setLatencyOptions({dropRate: 0});

  const wallet = await Wallet.create(peerEngines.a, messageService, DEFAULT__RETRY_OPTIONS);
  const walletB = await Wallet.create(peerEngines.b, messageService, DEFAULT__RETRY_OPTIONS);

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

  const wallet = await Wallet.create(peerEngines.a, messageService, DEFAULT__RETRY_OPTIONS);
  const walletB = await Wallet.create(peerEngines.b, messageService, DEFAULT__RETRY_OPTIONS);

  const result = await wallet.createChannels([getWithPeersCreateChannelsArgs(peerSetup)]);
  const {objectiveId} = result[0];
  await waitForObjectiveStarted([objectiveId], peerEngines.b);

  await messageService.freeze();
  const firstResult = await walletB.approveObjectives([objectiveId]);
  const secondResult = await walletB.approveObjectives([objectiveId]);
  // The objectives should be approved but should not have progressed further
  // due to the message service being frozen
  expect(firstResult[0].currentStatus).toBe('approved');
  expect(secondResult[0].currentStatus).toBe('approved');

  await messageService.unfreeze();

  await expect(firstResult).toBeObjectiveDoneType('Success');
  await expect(secondResult).toBeObjectiveDoneType('Success');
});
