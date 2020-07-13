import { Wallet } from '../..';
import { seed } from '../../../db/seeds/1_signing_wallet_seeds';
import knex from '../../../db/connection';
import { createChannelArgs } from '../fixtures/create-channel';
import { Channel } from '../../../models/channel';

// Make sure alice's PK is in the DB
beforeEach(async () => seed(knex));

it('creates a channel', async () => {
  const w = new Wallet();
  expect(await Channel.query().resultSize()).toEqual(0);
  await expect(w.createChannel(createChannelArgs())).resolves.not.toThrow();
  expect(await Channel.query().resultSize()).toEqual(1);
});
