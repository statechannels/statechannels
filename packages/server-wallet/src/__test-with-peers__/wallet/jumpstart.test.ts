import {Wallet} from '../../wallet';
import {
  crashAndRestart,
  getPeersSetup,
  messageService,
  peerEngines,
  peersTeardown,
} from '../../../jest/with-peers-setup-teardown';
import {ObjectiveModel, WalletObjective} from '../../models/objective';
import {getWithPeersCreateChannelsArgs} from '../utils';

beforeAll(getPeersSetup());
afterAll(peersTeardown);

jest.setTimeout(60_000);
describe('jumpstartObjectives', () => {
  it('returns an empty array when there are no objectives', async () => {
    const wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    const jumpstartResponse = await wallet.jumpStartObjectives();
    const jumpstartResults = await Promise.all(jumpstartResponse.map(r => r.done));

    expect(jumpstartResults).toHaveLength(0);
  });

  it('ignores completed objectives', async () => {
    const wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    const createResponse = await wallet.createChannels([getWithPeersCreateChannelsArgs()]);

    await ObjectiveModel.succeed(createResponse[0].objectiveId, peerEngines.a.knex);
    const jumpstartResponse = await wallet.jumpStartObjectives();
    const jumpstartResults = await Promise.all(jumpstartResponse.map(r => r.done));

    expect(jumpstartResults).toHaveLength(0);
  });

  it('can jumpstart objectives successfully after a restart', async () => {
    let wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    // This ensures that the channel will be joined so the objective can progress
    peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
      await peerEngines.b.joinChannels([o.data.targetChannelId]);
    });

    const numberOfChannels = 5;

    messageService.setLatencyOptions({dropRate: 1});
    const createResponse = await wallet.createChannels(
      Array(numberOfChannels).fill(getWithPeersCreateChannelsArgs())
    );
    const createResults = await Promise.all(createResponse.map(r => r.done));

    expect(createResults).toHaveLength(numberOfChannels);
    // No messages were sent through so we expect them all to fail
    expect(createResults.every(d => d.type === 'EnsureObjectiveFailed')).toBe(true);

    await crashAndRestart('A');

    wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    const jumpstartResponse = await wallet.jumpStartObjectives();
    const jumpstartResults = await Promise.all(jumpstartResponse.map(r => r.done));

    expect(jumpstartResults).toHaveLength(numberOfChannels);
    // Jumpstart should of completed the objectives
    expect(jumpstartResults.every(d => d.type === 'Success')).toBe(true);
  });
  it('can jumpstart objectives successfully', async () => {
    const wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    // This ensures that the channel will be joined so the objective can progress
    peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
      await peerEngines.b.joinChannels([o.data.targetChannelId]);
    });

    const numberOfChannels = 5;
    messageService.setLatencyOptions({dropRate: 1});
    const createResponse = await wallet.createChannels(
      Array(numberOfChannels).fill(getWithPeersCreateChannelsArgs())
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
