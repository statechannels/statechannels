import { Wallet } from '../..';
import { seed } from '../../../db/seeds/1_signing_wallet_seeds';
import knex from '../../../db/connection';
import { createChannelArgs } from '../fixtures/create-channel';
beforeEach(async () => seed(knex));

it.skip("doesn't throw on an empty message", () => {
  const wallet = new Wallet();

  return expect(
    wallet.createChannel(createChannelArgs())
  ).resolves.not.toThrow();
});
