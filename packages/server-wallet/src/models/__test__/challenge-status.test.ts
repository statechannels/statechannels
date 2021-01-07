import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {DBAdmin} from '../../db-admin/db-admin';
import {ChallengeStatus} from '../challenge-status';
import {Channel} from '../channel';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';

import {channel} from './fixtures/channel';

describe('ChallengeStatus model', () => {
  beforeEach(async () => {
    await new DBAdmin(knex).truncateDB();
    await seedAlicesSigningWallet(knex);
  });

  afterAll(async () => await knex.destroy());

  it('returns an active challenge status when the challenge is not finalized (finalizesAt>blockNumber)', async () => {
    const c = channel();
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    await ChallengeStatus.updateChallengeStatus(knex, c.channelId, 5, 1);

    const result = await ChallengeStatus.getChallengeStatus(knex, c.channelId);

    expect(result).toEqual({status: 'Challenge Active', finalizesAt: 5});
  });

  it('returns no challenge when there is not an entry', async () => {
    const c = channel();
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    const result = await ChallengeStatus.getChallengeStatus(knex, c.channelId);

    expect(result).toEqual({status: 'No Challenge Detected'});
  });

  it('returns no challenge when finalizesAt is 0', async () => {
    const c = channel();
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    await ChallengeStatus.updateChallengeStatus(knex, c.channelId, 0, 1);

    const result = await ChallengeStatus.getChallengeStatus(knex, c.channelId);

    expect(result).toEqual({status: 'No Challenge Detected'});
  });

  it('returns channel finalized when the channel is finalized (finalizedAt<=blockNumber)', async () => {
    const c = channel();
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    await ChallengeStatus.updateChallengeStatus(knex, c.channelId, 5, 10);

    const result = await ChallengeStatus.getChallengeStatus(knex, c.channelId);

    expect(result).toEqual({
      status: 'Challenge Finalized',
      finalizedAt: 5,
      finalizedBlockNumber: 10,
    });
  });
});
