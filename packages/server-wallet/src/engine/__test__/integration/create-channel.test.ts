import {OpenChannel} from '@statechannels/wallet-core';

import {Channel} from '../../../models/channel';
import {defaultTestEngineConfig, Engine} from '../..';
import {createChannelArgs} from '../fixtures/create-channel';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {defaultTestWalletConfig} from '../../../config';
import {DBAdmin} from '../../../db-admin/db-admin';
import {WalletObjective} from '../../../models/objective';
import {WaitingFor} from '../../../protocols/channel-opener';
import {createLogger} from '../../../logger';

let w: Engine;
beforeEach(async () => {
  const logger = createLogger(defaultTestWalletConfig());
  w = await Engine.create(defaultTestEngineConfig(), logger);
  await DBAdmin.truncateDataBaseFromKnex(w.knex);
});

afterEach(async () => {
  await w.destroy();
});

describe('happy path', () => {
  beforeEach(async () => seedAlicesSigningWallet(w.knex));

  it('creates a channel, and allows an objective to be queried through the API', async () => {
    expect(await Channel.query(w.knex).resultSize()).toEqual(0);

    const appData = '0xaf00';

    const createResult = await w.createChannels(createChannelArgs({appData}), 1);
    const channelId = '0x4460dab6d4438f3bf1719720fcced4054a38baf60f315e49995eead80cfa498f';
    expect(createResult).toMatchObject({channelResults: [{channelId}]});
    expect(createResult.newObjectives).toHaveLength(1);
    const objectiveId = `OpenChannel-${channelId}`;
    expect(createResult.newObjectives).toContainObject({
      type: 'OpenChannel',
      objectiveId,
    });

    expect(createResult).toMatchObject({
      outbox: [
        {
          params: {
            recipient: 'bob',
            sender: 'alice',
            data: {
              signedStates: [{turnNum: 0, appData}],
              objectives: [
                {
                  participants: [], // TODO: remove, currently deprecating participants
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

    expect(createResult.channelResults[0].channelId).toEqual(channelId);
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
    expect(await w.getObjective(objectiveId)).toMatchObject<WalletObjective<OpenChannel>>({
      objectiveId,
      createdAt: expect.any(Date),
      progressLastMadeAt: expect.any(Date),
      status: 'approved',
      participants: [],
      waitingFor: WaitingFor.theirPreFundSetup,
      type: 'OpenChannel',
      data: expect.anything(),
    });
  });

  it('creates many channels', async () => {
    expect(await Channel.query(w.knex).resultSize()).toEqual(0);

    const createArgs = createChannelArgs({appData: '0xaf00'});
    const NUM_CHANNELS = 10;

    const result = await w.createChannels(createArgs, NUM_CHANNELS);
    expect(result.channelResults).toHaveLength(NUM_CHANNELS);
    expect(result.newObjectives).toHaveLength(NUM_CHANNELS);
    expect(result.outbox).toHaveLength(1);

    expect(await Channel.query(w.knex).resultSize()).toEqual(NUM_CHANNELS);
  }, 10_000);
});

it("doesn't create a channel if it doesn't have a signing wallet", () =>
  expect(w.createChannels(createChannelArgs(), 1)).rejects.toThrow('Not in channel'));
