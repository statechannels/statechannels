import {getPeersSetup, PeerSetup, teardownPeerSetup} from '../../../jest/with-peers-setup-teardown';
import {LatencyOptions} from '../../message-service/test-message-service';
import {Wallet} from '../../wallet/wallet';
import {getWithPeersCreateChannelsArgs, waitForObjectiveEvent} from '../utils';

jest.setTimeout(120_000);
let peerSetup: PeerSetup;

beforeAll(async () => {
  peerSetup = await getPeersSetup();
});
afterAll(async () => {
  await teardownPeerSetup(peerSetup);
});

describe('CloseChannels', () => {
  // This is the percentages of messages that get dropped
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
    {dropRate: 0.05, meanDelay: 15, closer: 'A'},
    {dropRate: 0.05, meanDelay: 15, closer: 'B'},
  ];
  test.each(testCases)(
    'can successfully create and close channel with the latency options: %o',
    async options => {
      const {peerEngines, messageService} = peerSetup;
      // Always reset the latency options back to no drop / delay
      // This prevents the next test from using delay/dropping when doing setup
      peerSetup.messageService.setLatencyOptions({dropRate: 0, meanDelay: undefined});

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

      const response = await wallet.createChannels(
        Array(10).fill(getWithPeersCreateChannelsArgs(peerSetup))
      );
      const createChannelObjectiveIds = response.map(o => o.objectiveId);
      await waitForObjectiveEvent(createChannelObjectiveIds, 'objectiveStarted', peerEngines.b);
      const bResponse = await walletB.approveObjectives(createChannelObjectiveIds);
      // Sanity check that create channel succeeds
      await expect(response).toBeObjectiveDoneType('Success');
      await expect(bResponse).toBeObjectiveDoneType('Success');

      // Now that the channels are up and running we can set the latency options
      messageService.setLatencyOptions(options);

      const channelIds = response.map(o => o.channelId);
      const closingWallet = options.closer === 'A' ? wallet : walletB;
      // We want to to make sure the non closing wallet manages to complete all the objectives
      const engineToWaitOn = options.closer === 'A' ? peerEngines.b : peerEngines.a;

      const closeChannelObjectiveIds = channelIds.map(c => `CloseChannel-${c}`);
      // Since closing requires no approval we need to setup the promise
      // before we call closeChannel. Otherwise we could miss events
      const allObjectivesSucceeded = waitForObjectiveEvent(
        closeChannelObjectiveIds,
        'objectiveSucceeded',
        engineToWaitOn
      );
      const closeResponse = await closingWallet.closeChannels(channelIds);

      await expect(closeResponse).toBeObjectiveDoneType('Success');
      await allObjectivesSucceeded;

      // Ensure that A has all closed channels
      const {channelResults: aChannels} = await peerEngines.a.getChannels();
      for (const a of aChannels) {
        expect(a.status).toEqual('closed');
      }
      // Ensure that A has all closed channels
      const {channelResults: bChannels} = await peerEngines.a.getChannels();
      for (const b of bChannels) {
        expect(b.status).toEqual('closed');
      }
    }
  );
});
