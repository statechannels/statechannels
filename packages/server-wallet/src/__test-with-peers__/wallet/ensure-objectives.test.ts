import {
  teardownPeerSetup,
  setupPeerWallets,
  PeerSetupWithWallets,
} from '../../../jest/with-peers-setup-teardown';
import {LatencyOptions, TestMessageService} from '../../message-service/test-message-service';
import {getWithPeersCreateChannelsArgs, waitForObjectiveProposals} from '../utils';

jest.setTimeout(60_000);
let peerSetup: PeerSetupWithWallets;

beforeAll(async () => {
  peerSetup = await setupPeerWallets();
});
afterAll(async () => {
  await teardownPeerSetup(peerSetup);
});

describe('EnsureObjectives', () => {
  // This is the percentages of messages that get dropped
  const testCases: LatencyOptions[] = [
    // No latency/message dropping
    {
      dropRate: 0,
      meanDelay: undefined,
    },
    // Lots of messages dropping but no delay
    {dropRate: 0.3, meanDelay: undefined},
    // delay but no dropping
    {dropRate: 0, meanDelay: 50},
    // Delay and drop
    {dropRate: 0.2, meanDelay: 25},
  ];
  test.each(testCases)(
    'can successfully create a channel with the latency options: %o',
    async options => {
      const {peerWallets, peerEngines} = peerSetup;
      TestMessageService.setLatencyOptions(peerWallets, options);

      const response = await peerWallets.a.createChannels(
        Array(1).fill(getWithPeersCreateChannelsArgs(peerSetup))
      );

      const objectiveIds = response.map(o => o.objectiveId);
      await waitForObjectiveProposals(objectiveIds, peerWallets.b);
      const bResponse = await peerWallets.b.approveObjectives(objectiveIds);
      await expect(response).toBeObjectiveDoneType('Success');
      await expect(bResponse).toBeObjectiveDoneType('Success');

      // Ensure that all of A's channels are running
      const {channelResults: aChannels} = await peerEngines.a.getChannels();
      for (const a of aChannels) {
        expect(a.status).toEqual('running');
      }

      // Ensure that all of B's channels are running
      const {channelResults: bChannels} = await peerEngines.a.getChannels();
      for (const b of bChannels) {
        expect(b.status).toEqual('running');
      }
    }
  );

  // TODO: Determine why this is failing
  //  This is a nice sanity check to ensure that messages do get dropped
  test.skip('fails when all messages are dropped', async () => {
    const {peerWallets} = peerSetup;
    TestMessageService.setLatencyOptions(peerWallets, {dropRate: 1});

    const result = await peerWallets.a.createChannels([getWithPeersCreateChannelsArgs(peerSetup)]);

    await expect(result).toBeObjectiveDoneType('EnsureObjectiveFailed');
  });
});
