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

describe('CreateLedger', () => {
  // This is the percentages of messages that get dropped
  const testCases: LatencyOptions[] = [
    // No latency/message dropping
    {
      dropRate: 0,
      meanDelay: undefined,
    },

    // Delay and drop
    {dropRate: 0.1, meanDelay: 25},
  ];
  test.each(testCases)(
    'can successfully create a ledger channel with the latency options: %o',
    async options => {
      const {peerWallets, peerEngines} = peerSetup;
      TestMessageService.setLatencyOptions(peerWallets, options);

      const ledgerResponse = await peerWallets.a.createLedgerChannel(
        getWithPeersCreateChannelsArgs(peerSetup)
      );
      const {objectiveId: ledgerObjectiveId} = ledgerResponse;
      await waitForObjectiveProposals([ledgerObjectiveId], peerWallets.b);

      const bResponse = await peerWallets.b.approveObjectives([ledgerObjectiveId]);
      expect(await ledgerResponse.done).toMatchObject({type: 'Success'});
      await expect(bResponse).toBeObjectiveDoneType('Success');

      // We should be able to fund a channel with the ledger channel we just created
      const createResponse = await peerWallets.a.createChannels([
        {
          ...getWithPeersCreateChannelsArgs(peerSetup),
          fundingStrategy: 'Ledger',
          fundingLedgerChannelId: ledgerResponse.channelId,
        },
      ]);

      const {objectiveId: fundedByLedgerObjectiveId} = createResponse[0];

      await waitForObjectiveProposals([fundedByLedgerObjectiveId], peerWallets.b);
      const bCreateResponse = await peerWallets.b.approveObjectives([fundedByLedgerObjectiveId]);
      await expect(createResponse).toBeObjectiveDoneType('Success');
      await expect(bCreateResponse).toBeObjectiveDoneType('Success');
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
});
