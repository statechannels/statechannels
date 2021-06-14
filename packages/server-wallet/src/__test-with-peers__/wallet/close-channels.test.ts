import {
  teardownPeerSetup,
  PeerSetupWithWallets,
  setupPeerWallets,
} from '../../../jest/with-peers-setup-teardown';
import {LatencyOptions, TestMessageService} from '../../message-service/test-message-service';
import {getWithPeersCreateChannelsArgs, waitForObjectiveProposals} from '../utils';

jest.setTimeout(120_000);
let peerSetup: PeerSetupWithWallets;

beforeAll(async () => {
  peerSetup = await setupPeerWallets();
});
afterAll(async () => {
  await teardownPeerSetup(peerSetup);
});

describe('CloseChannels', () => {
  const testCases: Array<LatencyOptions & {closer: 'A' | 'B'}> = [
    // No latency/message dropping
    {
      dropRate: 0,
      meanDelay: undefined,
      closer: 'A',
    },
    // No latency/message dropping
    {
      dropRate: 0,
      meanDelay: undefined,
      closer: 'B',
    },

    // Delay and drop
    {dropRate: 0.1, meanDelay: 15, closer: 'A'},
    // TODO: This test case can fail due to https://github.com/statechannels/statechannels/issues/3530
    //{dropRate: 0.1, meanDelay: 15, closer: 'B'},
  ];
  test.each(testCases)(
    'can successfully create and close channel with the latency options: %o',
    async options => {
      const {peerEngines, peerWallets} = peerSetup;
      // Always reset the latency options back to no drop / delay
      // This prevents the next test from using delay/dropping when doing setup
      TestMessageService.setLatencyOptions(peerWallets, {dropRate: 0, meanDelay: undefined});

      const closingWallet = options.closer === 'A' ? peerWallets.a : peerWallets.b;
      const walletReceivingClose = options.closer === 'A' ? peerWallets.b : peerWallets.a;

      const response = await closingWallet.createChannels(
        Array(10).fill(getWithPeersCreateChannelsArgs(peerSetup))
      );
      const createChannelObjectiveIds = response.map(o => o.objectiveId);

      await waitForObjectiveProposals(createChannelObjectiveIds, walletReceivingClose);

      const receivingCloseResponse = await walletReceivingClose.approveObjectives(
        createChannelObjectiveIds
      );
      // Sanity check that create channel succeeds
      await expect(response).toBeObjectiveDoneType('Success');
      await expect(receivingCloseResponse).toBeObjectiveDoneType('Success');

      // Now that the channels are up and running we can set the latency options
      TestMessageService.setLatencyOptions(peerWallets, options);
      // Freeze messages so we can set up our listeners for engineToWaitOn
      TestMessageService.freeze(peerWallets);

      const channelIds = response.map(o => o.channelId);

      const closeResponse = await closingWallet.closeChannels(channelIds);
      const secondCloseResponse = await closingWallet.closeChannels(channelIds);

      // Since messages are frozen we expect everything stuck on the approved status
      expect(closeResponse.every(o => o.currentStatus === 'approved')).toBe(true);
      expect(secondCloseResponse.every(o => o.currentStatus === 'approved')).toBe(true);

      // Now that we're done with the setup we can unfreeze and let the messages fly
      TestMessageService.unfreeze(peerWallets);

      // We expect both promises to resolve to success
      await expect(closeResponse).toBeObjectiveDoneType('Success');
      await expect(secondCloseResponse).toBeObjectiveDoneType('Success');

      // Ensure that A has all closed channels
      const {channelResults: aChannels} = await peerEngines.a.getChannels();
      for (const a of aChannels) {
        expect(a.status).toEqual('closed');
      }
      // Ensure that B has all closed channels
      const {channelResults: bChannels} = await peerEngines.b.getChannels();
      for (const b of bChannels) {
        expect(b.status).toEqual('closed');
      }
    }
  );
});
