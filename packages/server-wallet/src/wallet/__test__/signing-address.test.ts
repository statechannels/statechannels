import {ethers} from 'ethers';

import {truncate} from '../../db-admin/db-admin-connection';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultConfig, extractDBConfigFromServerWalletConfig} from '../../config';

import {alice} from './fixtures/participants';

beforeEach(async () => {
  await truncate(knex);
});

const store = new Store(
  extractDBConfigFromServerWalletConfig(defaultConfig),
  defaultConfig.timingMetrics,
  defaultConfig.skipEvmValidation
);

describe('signingAddress', () => {
  it('generate address then get address', async () => {
    const signingAddress = await store.getOrCreateSigningAddress(knex);
    expect(signingAddress).toBeDefined();
    expect(ethers.utils.isAddress(signingAddress)).toBeTruthy();

    const signingAddress2 = await store.getOrCreateSigningAddress(knex);
    expect(signingAddress).toEqual(signingAddress2);
  });

  it('prepopulated address returned correctly', async () => {
    await seedAlicesSigningWallet(knex);
    const signingAddress = await store.getOrCreateSigningAddress(knex);
    expect(signingAddress).toEqual(alice().signingAddress);
  });
});
