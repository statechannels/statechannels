import _ from 'lodash';

import {defaultTestConfig, Wallet} from '..';
import {DBAdmin} from '../../db-admin/db-admin';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {AdjudicatorStatusModel} from '../../models/adjudicator-status';
import {Channel} from '../../models/channel';
import {DBObjective, ObjectiveModel} from '../../models/objective';
import {channel} from '../../models/__test__/fixtures/channel';

import {alice, bob} from './fixtures/signing-wallets';
import {stateWithHashSignedBy} from './fixtures/states';

let w: Wallet;
beforeAll(async () => {
  w = await Wallet.create(defaultTestConfig());
});

beforeEach(async () => {
  await DBAdmin.truncateDataBaseFromKnex(w.knex);
  await seedAlicesSigningWallet(w.knex);
});
it('throws an error when challenging with a non ledger channel', async () => {
  const c = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
    initialSupport: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
  });
  await Channel.query(w.knex).insert(c);

  const {channelId} = c;

  expect(c.isLedger).toBe(false);

  await expect(w.challenge(channelId)).rejects.toThrow('Only ledger channels support challenging');
});
it('submits a challenge when no challenge exists for a channel', async () => {
  const spy = jest.spyOn(w.chainService, 'challenge');
  const callback = jest.fn();
  w.once('objectiveStarted', callback);
  const c = channel({
    channelNonce: 1,
    // Set a random address so this will be a "ledger" channel
    assetHolderAddress: '0xC4d65072D3a32E6E25D5A97c857D892D6aa6F2A4',
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
    initialSupport: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
  });
  await Channel.query(w.knex).insert(c);

  const {channelId} = c;

  const current = await AdjudicatorStatusModel.getAdjudicatorStatus(w.knex, channelId);

  expect(c.isLedger).toBe(true);
  expect(current.channelMode).toEqual('Open');

  await w.challenge(channelId);
  expect(spy).toHaveBeenCalledWith(c.initialSupport, alice().privateKey);
  expect(callback).toHaveBeenCalledWith(expect.objectContaining({type: 'SubmitChallenge'}));
});

it('stores the challenge state on the challenge created event', async () => {
  const c = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
  });
  await Channel.query(w.knex).insert(c);
  const current = await AdjudicatorStatusModel.getAdjudicatorStatus(w.knex, c.channelId);

  expect(current.channelMode).toEqual('Open');
  const challengeState = stateWithHashSignedBy([alice()])({turnNum: 1});
  const {channelId} = c;
  await w.challengeRegistered({channelId, finalizesAt: 200, challengeStates: [challengeState]});
  const updated = await AdjudicatorStatusModel.getAdjudicatorStatus(w.knex, c.channelId);

  expect(updated.channelMode).toEqual('Challenge');
  expect((updated as any).states).toMatchObject([challengeState]);
});

it('creates a defundChannel objective on channel finalized', async () => {
  const c = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
  });
  await Channel.query(w.knex).insert(c);

  await w.channelFinalized({
    channelId: c.channelId,
    blockNumber: 3,
    blockTimestamp: 100,
    finalizedAt: 50,
  });
  const objectiveId = `DefundChannel-${c.channelId}`;
  const objective = await ObjectiveModel.forId(objectiveId, w.knex);

  expect(objective).toEqual<DBObjective>({
    objectiveId,
    status: 'approved',
    type: 'DefundChannel',
    waitingFor: expect.any(String),
    data: {
      targetChannelId: c.channelId,
    },
    participants: [],
    createdAt: expect.anything(),
    progressLastMadeAt: expect.anything(),
  });
});

afterAll(async () => {
  await w.destroy();
});
