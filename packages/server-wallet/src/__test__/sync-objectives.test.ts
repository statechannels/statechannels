import {CreateChannelParams} from '@statechannels/client-api-schema';
import Knex from 'knex';

import {defaultTestConfig, overwriteConfigWithDatabaseConnection} from '../config';
import {DBAdmin} from '../db-admin/db-admin';
import {seedAlicesSigningWallet, seedBobsSigningWallet} from '../db/seeds/1_signing_wallet_seeds';
import {DBObjective, ObjectiveModel} from '../models/objective';
import {Wallet} from '../wallet';
import {createChannelArgs} from '../wallet/__test__/fixtures/create-channel';
import {bob} from '../wallet/__test__/fixtures/participants';

import {getChannelResultFor, getPayloadFor} from './test-helpers';

jest.setTimeout(10_000);
const aWalletConfig = overwriteConfigWithDatabaseConnection(defaultTestConfig(), {
  database: 'TEST_A',
});
const bWalletConfig = overwriteConfigWithDatabaseConnection(defaultTestConfig(), {
  database: 'TEST_B',
});

let a: Wallet;
let b: Wallet;

beforeAll(async () => {
  await Promise.all([DBAdmin.dropDatabase(aWalletConfig), DBAdmin.dropDatabase(bWalletConfig)]);
  await DBAdmin.createDatabase(aWalletConfig);
  await DBAdmin.createDatabase(bWalletConfig);
  await Promise.all([
    DBAdmin.migrateDatabase(aWalletConfig),
    DBAdmin.migrateDatabase(bWalletConfig),
  ]);
  a = await Wallet.create(aWalletConfig);
  b = await Wallet.create(bWalletConfig);

  await seedAlicesSigningWallet(a.knex);
  await seedBobsSigningWallet(b.knex);
});
afterAll(async () => {
  await Promise.all([a.destroy(), b.destroy()]);
  await Promise.all([DBAdmin.dropDatabase(aWalletConfig), DBAdmin.dropDatabase(bWalletConfig)]);
});

test('Objectives can be synced if a message is lost', async () => {
  const createChannelParams: CreateChannelParams = createChannelArgs();

  // We mimic not receiving a message containing objectives
  const messageToLose = await a.createChannel(createChannelParams);

  const channelId = messageToLose.channelResults[0].channelId;
  const objectiveId = `OpenChannel-${channelId}`;

  // Only A should have the objective since we "lost" the message
  expect(await getObjective(a.knex, objectiveId)).toBeDefined();
  expect(await getObjective(b.knex, objectiveId)).toBeUndefined();

  // We would then call sync after some time of waiting and not making progress
  const syncResult = await a.syncObjectives([objectiveId]);

  // We should now see the objective
  expect(await getObjective(b.knex, objectiveId)).toBeUndefined();

  // After sync funding should continue as normal
  const resultB0 = await b.pushMessage(getPayloadFor(bob().participantId, syncResult.outbox));
  expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });
});

async function getObjective(knex: Knex, objectiveId: string): Promise<DBObjective | undefined> {
  const model = await ObjectiveModel.query(knex).findById(objectiveId);
  return model?.toObjective();
}
