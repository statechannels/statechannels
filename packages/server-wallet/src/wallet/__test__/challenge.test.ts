import _ from 'lodash';

import {defaultTestConfig, Wallet} from '..';
import {DBAdmin} from '../../db-admin/db-admin';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {ChallengeStatus} from '../../models/challenge-status';
import {Channel} from '../../models/channel';
import {channel} from '../../models/__test__/fixtures/channel';

import {alice, bob} from './fixtures/signing-wallets';
import {stateWithHashSignedBy} from './fixtures/states';

let w: Wallet;
beforeAll(async () => {
  w = Wallet.create(defaultTestConfig());
});

beforeEach(async () => {
  await new DBAdmin(w.knex).truncateDB();
  await seedAlicesSigningWallet(w.knex);
});

it('submits a challenge when no challenge exists for a channel', async () => {
  const spy = jest.spyOn(w.chainService, 'challenge');
  const c = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
  });
  await Channel.query(w.knex).insert(c);

  const {channelId} = c;

  const current = await ChallengeStatus.getChallengeStatus(w.knex, channelId);

  expect(current.status).toEqual('No Challenge Detected');
  const challengeState = {
    ...c.channelConstants,
    ..._.pick(c.latest, ['turnNum', 'outcome', 'appData', 'isFinal']),
  };
  await w.challenge(challengeState);
  expect(spy).toHaveBeenCalledWith([expect.objectContaining(challengeState)], alice().privateKey);
});

it('stores the challenge state on the challenge created event', async () => {
  const c = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
  });
  await Channel.query(w.knex).insert(c);
  const current = await ChallengeStatus.getChallengeStatus(w.knex, c.channelId);

  expect(current.status).toEqual('No Challenge Detected');
  const challengeState = {
    ...c.channelConstants,
    ..._.pick(c.latest, ['turnNum', 'outcome', 'appData', 'isFinal']),
  };
  const {channelId} = c;
  await w.challengeRegistered({channelId, finalizesAt: 200, challengeStates: [challengeState]});
  const updated = await ChallengeStatus.getChallengeStatus(w.knex, c.channelId);

  expect(updated.status).toEqual('Challenge Active');
  expect((updated as any).challengeState).toMatchObject(challengeState);
});

afterAll(async () => {
  await w.destroy();
});
