import {ethers} from 'ethers';
import Knex from 'knex';

import {truncate} from '../../db-admin/db-admin-connection';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {defaultConfig, extractDBConfigFromServerWalletConfig} from '../../config';

import {alice} from './fixtures/participants';

const knex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));

beforeEach(async () => {
  await truncate(knex);
});

describe('signingAddress', () => {
  it('generate address then get address', async () => {
    const signingAddress = await Store.getOrCreateSigningAddress();
    expect(signingAddress).toBeDefined();
    expect(ethers.utils.isAddress(signingAddress)).toBeTruthy();

    const signingAddress2 = await Store.getOrCreateSigningAddress();
    expect(signingAddress).toEqual(signingAddress2);
  });

  it('prepopulated address returned correctly', async () => {
    await seedAlicesSigningWallet(knex);
    const signingAddress = await Store.getOrCreateSigningAddress();
    expect(signingAddress).toEqual(alice().signingAddress);
  });
});
