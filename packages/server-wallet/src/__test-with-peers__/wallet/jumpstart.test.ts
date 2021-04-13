import {Wallet} from '../../wallet';
import {
  crashAndRestart,
  getPeersSetup,
  PeerSetup,
  peersTeardown,
} from '../../../jest/with-peers-setup-teardown';
import {ObjectiveModel, WalletObjective} from '../../models/objective';
import {getWithPeersCreateChannelsArgs} from '../utils';

let peerSetup: PeerSetup;
beforeAll(async () => {
  peerSetup = await getPeersSetup();
});
afterAll(async () => {
  await peersTeardown(peerSetup);
});
jest.setTimeout(60_000);

describe('jumpstartObjectives', () => {
  it('returns an empty array when there are no objectives', async () => {
    const {peerEngines, messageService} = peerSetup;
    const wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    expect(await wallet.jumpStartObjectives()).toHaveLength(0);
  });

  it('ignores completed objectives', async () => {
    const {peerEngines, messageService} = peerSetup;
    const wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    const createResponse = await wallet.createChannels([getWithPeersCreateChannelsArgs(peerSetup)]);

    await ObjectiveModel.succeed(createResponse[0].objectiveId, peerEngines.a.knex);
    expect(await wallet.jumpStartObjectives()).toHaveLength(0);
  });

  it('can jumpstart objectives successfully after a restart', async () => {
    const {peerEngines, messageService} = peerSetup;
    let wallet = await Wallet.create(peerEngines.a, messageService, {numberOfAttempts: 1});

    // This ensures that the channel will be joined so the objective can progress
    peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
      await peerEngines.b.joinChannels([o.data.targetChannelId]);
    });

    const numberOfChannels = 5;

    messageService.setLatencyOptions({dropRate: 1});
    const createResponse = await wallet.createChannels(
      Array(numberOfChannels).fill(getWithPeersCreateChannelsArgs(peerSetup))
    );

    await expect(createResponse).toBeObjectiveDoneType('EnsureObjectiveFailed');

    const restartedPeerSetup = await crashAndRestart(peerSetup, 'A');

    wallet = await Wallet.create(
      restartedPeerSetup.peerEngines.a,
      restartedPeerSetup.messageService,
      {numberOfAttempts: 1}
    );

    const jumpstartResponse = await wallet.jumpStartObjectives();

    await expect(jumpstartResponse).toBeObjectiveDoneType('Success');
  });

  it('can jumpstart multiple times', async () => {
    const {peerEngines, messageService} = peerSetup;
    const wallet = await Wallet.create(peerEngines.a, messageService, {
      numberOfAttempts: 99999, // We want the wallet to keep trying
      initialDelay: 100,
      multiple: 1,
    });

    // This ensures that the channel will be joined so the objective can progress
    peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
      await peerEngines.b.joinChannels([o.data.targetChannelId]);
    });

    const numberOfChannels = 5;

    // No messages get through so none of the promises should resolve
    messageService.setLatencyOptions({dropRate: 1});

    const createResponse = await wallet.createChannels(
      Array(numberOfChannels).fill(getWithPeersCreateChannelsArgs(peerSetup))
    );
    const jumpstartResponse1 = await wallet.jumpStartObjectives();
    const jumpstartResponse2 = await wallet.jumpStartObjectives();

    // Allow the messages through. The next retry from jumpstart or create will get a message through.
    messageService.setLatencyOptions({dropRate: 0});

    await expect(createResponse).toBeObjectiveDoneType('Success');
    await expect(jumpstartResponse1).toBeObjectiveDoneType('Success');
    await expect(jumpstartResponse2).toBeObjectiveDoneType('Success');
  });
});
