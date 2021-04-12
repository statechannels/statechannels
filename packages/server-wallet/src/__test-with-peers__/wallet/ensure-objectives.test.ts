import {
  getPeersSetup,
  messageService,
  peersTeardown,
  peerEngines,
} from '../../../jest/with-peers-setup-teardown';
import {LatencyOptions} from '../../message-service/test-message-service';
import {WalletObjective} from '../../models/objective';
import {Wallet} from '../../wallet/wallet';
import {getWithPeersCreateChannelsArgs} from '../utils';

jest.setTimeout(60_000);

beforeAll(getPeersSetup());
afterAll(peersTeardown);

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
      messageService.setLatencyOptions(options);
      const wallet = await Wallet.create(peerEngines.a, messageService, {
        numberOfAttempts: 100,
        initialDelay: 100,
        multiple: 1,
      });

      peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
        await peerEngines.b.joinChannels([o.data.targetChannelId]);
      });

      const response = await wallet.createChannels(
        Array(10).fill(getWithPeersCreateChannelsArgs())
      );

      await expect(response).toBeObjectiveDoneType('Success');
    }
  );

  //  This is a nice sanity check to ensure that messages do get dropped
  test('fails when all messages are dropped', async () => {
    messageService.setLatencyOptions({dropRate: 1});
    // We limit the attempts to avoid wasting times in the test
    const wallet = await Wallet.create(peerEngines.a, messageService, {
      numberOfAttempts: 1,
    });

    peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
      const {targetChannelId: channelId} = o.data;
      await peerEngines.b.joinChannels([channelId]);
    });

    const {done} = (await wallet.createChannels([getWithPeersCreateChannelsArgs()]))[0];
    await expect(done).resolves.toMatchObject({type: 'EnsureObjectiveFailed'});
  });
});
