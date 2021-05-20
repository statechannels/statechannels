import {
  teardownPeerSetup,
  PeerSetupWithWallets,
  setupPeerWallets,
} from '../../../jest/with-peers-setup-teardown';
import {TestMessageService} from '../../message-service/test-message-service';
import {ObjectiveModel} from '../../models/objective';
import {getWithPeersCreateChannelsArgs, waitForObjectiveProposals} from '../utils';

let peerSetup: PeerSetupWithWallets;
beforeAll(async () => {
  peerSetup = await setupPeerWallets();
});
afterAll(async () => {
  await teardownPeerSetup(peerSetup);
});
jest.setTimeout(600000_000);

describe('jumpstartObjectives', () => {
  it('returns an empty array when there are no objectives', async () => {
    const {peerWallets} = peerSetup;

    expect(await peerWallets.a.jumpStartObjectives()).toHaveLength(0);
  });

  it('ignores completed objectives', async () => {
    const {peerEngines, peerWallets} = peerSetup;

    const createResponse = await peerWallets.a.createChannels([
      getWithPeersCreateChannelsArgs(peerSetup),
    ]);

    await ObjectiveModel.succeed(createResponse[0].objectiveId, peerEngines.a.knex);
    expect(await peerWallets.a.jumpStartObjectives()).toHaveLength(0);
  });

  it('can jumpstart objectives successfully after they fail to send', async () => {
    const {peerWallets} = peerSetup;

    const numberOfChannels = 5;

    TestMessageService.setLatencyOptions(peerWallets, {dropRate: 1});
    const createResponse = await peerWallets.a.createChannels(
      Array(numberOfChannels).fill(getWithPeersCreateChannelsArgs(peerSetup))
    );

    await expect(createResponse).toBeObjectiveDoneType('EnsureObjectiveFailed');

    TestMessageService.setLatencyOptions(peerWallets, {dropRate: 0});
    const jumpstartResponse = await peerWallets.a.jumpStartObjectives();
    const objectiveIds = createResponse.map(r => r.objectiveId);
    await waitForObjectiveProposals(objectiveIds, peerWallets.b);
    await peerWallets.b.approveObjectives(objectiveIds);
    await expect(jumpstartResponse).toBeObjectiveDoneType('Success');
  });

  it('can jumpstart multiple times', async () => {
    const {peerWallets} = peerSetup;

    const numberOfChannels = 1;

    // No messages get through so none of the promises should resolve
    TestMessageService.setLatencyOptions(peerWallets, {dropRate: 1});

    const createResponse = await peerWallets.a.createChannels(
      Array(numberOfChannels).fill(getWithPeersCreateChannelsArgs(peerSetup))
    );
    const objectiveIds = createResponse.map(o => o.objectiveId);

    const jumpstartResponse1 = await peerWallets.a.jumpStartObjectives();
    const jumpstartResponse2 = await peerWallets.a.jumpStartObjectives();

    // Allow the messages through. The next retry from jumpstart or create will get a message through.
    TestMessageService.setLatencyOptions(peerWallets, {dropRate: 0});
    await waitForObjectiveProposals(objectiveIds, peerWallets.b);
    await peerWallets.b.approveObjectives(objectiveIds);
    await expect(createResponse).toBeObjectiveDoneType('Success');

    await expect(jumpstartResponse1).toBeObjectiveDoneType('Success');
    await expect(jumpstartResponse2).toBeObjectiveDoneType('Success');
  });
});
