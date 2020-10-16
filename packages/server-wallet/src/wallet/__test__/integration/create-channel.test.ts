import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {createChannelArgs} from '../fixtures/create-channel';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {defaultTestConfig} from '../../../config';
import {alice, bob} from '../fixtures/participants';
import {DBAdmin} from '../../../db-admin/db-admin';

let w: Wallet;
beforeEach(async () => {
  w = new Wallet(defaultTestConfig);
  await new DBAdmin(w.knex).truncateDB();
});

afterEach(async () => {
  await w.destroy();
});

describe('happy path', () => {
  beforeEach(async () => seedAlicesSigningWallet(w.knex));

  it('creates a channel', async () => {
    expect(await Channel.query(w.knex).resultSize()).toEqual(0);

    const appData = '0xaf00';
    const createPromise = w.createChannels(createChannelArgs({appData}), 1);
    await expect(createPromise).resolves.toMatchObject({
      channelResults: [{channelId: expect.any(String)}],
    });

    await expect(createPromise).resolves.toMatchObject({
      outbox: [
        {
          params: {
            recipient: 'bob',
            sender: 'alice',
            data: {
              signedStates: [{turnNum: 0, appData}],
              objectives: [
                {
                  participants: [alice(), bob()],
                  data: {
                    fundingStrategy: 'Direct',
                  },
                  type: 'OpenChannel',
                },
              ],
            },
          },
        },
      ],
      channelResults: [{channelId: expect.any(String), turnNum: 0, appData}],
    });
    const {channelId} = (await createPromise).channelResults[0];
    expect(await Channel.query(w.knex).resultSize()).toEqual(1);

    const updated = await Channel.forId(channelId, w.knex);
    const expectedState = {
      turnNum: 0,
      appData,
    };
    expect(updated).toMatchObject({
      latest: expectedState,
      latestSignedByMe: expectedState,
      supported: undefined,
    });
  });

  it('creates many channels', async () => {
    expect(await Channel.query(w.knex).resultSize()).toEqual(0);

    const createArgs = createChannelArgs({appData: '0xaf00'});
    const NUM_CHANNELS = 10;

    const result = await w.createChannels(createArgs, NUM_CHANNELS);
    expect(result.channelResults).toHaveLength(NUM_CHANNELS);
    expect(result.outbox).toHaveLength(1);

    expect(await Channel.query(w.knex).resultSize()).toEqual(NUM_CHANNELS);
  }, 10_000);
});

it("doesn't create a channel if it doesn't have a signing wallet", () =>
  expect(w.createChannels(createChannelArgs(), 1)).rejects.toThrow('Not in channel'));
