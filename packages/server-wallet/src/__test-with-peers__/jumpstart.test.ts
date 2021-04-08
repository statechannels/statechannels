import {CreateChannelParams} from '@statechannels/client-api-schema';

import {Wallet} from '../wallet';
import {
  getPeersSetup,
  messageService,
  participantA,
  participantB,
  peerEngines,
  peersTeardown,
} from '../../jest/with-peers-setup-teardown';
import {createChannelArgs} from '../engine/__test__/fixtures/create-channel';
import {WalletObjective} from '../models/objective';

beforeAll(getPeersSetup());
afterAll(peersTeardown);

jest.setTimeout(60_000);
describe('jumpstartObjectives', () => {
  it('can jumpstart objectives successfully', async () => {
    const wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    // This ensures that the channel will be joined so the objective can progress
    peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
      await peerEngines.b.joinChannels([o.data.targetChannelId]);
    });

    const numberOfChannels = 5;
    messageService.setLatencyOptions({dropRate: 1});
    const createResponse = await wallet.createChannels(
      Array(numberOfChannels).fill(getCreateChannelsArgs())
    );
    const createResults = await Promise.all(createResponse.map(r => r.done));

    expect(createResults).toHaveLength(numberOfChannels);
    // No messages were sent through so we expect them all to fail
    expect(createResults.every(d => d.type === 'EnsureObjectiveFailed')).toBe(true);

    // Allow all messages through
    messageService.setLatencyOptions({dropRate: 0});

    const jumpstartResponse = await wallet.jumpStartObjectives();
    const jumpstartResults = await Promise.all(jumpstartResponse.map(r => r.done));

    expect(jumpstartResults).toHaveLength(numberOfChannels);
    // Jumpstart should of completed the objectives
    expect(jumpstartResults.every(d => d.type === 'Success')).toBe(true);
  });
});

function getCreateChannelsArgs(): CreateChannelParams {
  return createChannelArgs({
    participants: [participantA, participantB],
    fundingStrategy: 'Fake',
  });
}
