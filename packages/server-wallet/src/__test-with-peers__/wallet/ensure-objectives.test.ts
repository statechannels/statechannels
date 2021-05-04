import {
  teardownPeerSetup,
  setupPeerWallets,
  PeerSetupWithWallets,
} from '../../../jest/with-peers-setup-teardown';
import {LatencyOptions} from '../../message-service/test-message-service';
import {WalletObjective} from '../../models/objective';
import {getWithPeersCreateChannelsArgs, setLatencyOptions, waitForObjectiveEvent} from '../utils';

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
      setLatencyOptions(peerWallets, options);

      const response = await peerWallets.a.createChannels(
        Array(1).fill(getWithPeersCreateChannelsArgs(peerSetup))
      );

      const objectiveIds = response.map(o => o.objectiveId);
      await waitForObjectiveEvent(objectiveIds, 'objectiveStarted', peerEngines.b);
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

  //  This is a nice sanity check to ensure that messages do get dropped
  test('fails when all messages are dropped', async () => {
    const {peerEngines, peerWallets} = peerSetup;
    setLatencyOptions(peerWallets, {dropRate: 1});
    const listener = async (o: WalletObjective) => {
      await peerWallets.b.approveObjectives([o.objectiveId]);
    };
    peerEngines.b.on('objectiveStarted', listener);

    const result = await peerWallets.a.createChannels([getWithPeersCreateChannelsArgs(peerSetup)]);

    await expect(result).toBeObjectiveDoneType('EnsureObjectiveFailed');
    peerEngines.b.removeListener('objectiveStarted', listener);
  });
});
