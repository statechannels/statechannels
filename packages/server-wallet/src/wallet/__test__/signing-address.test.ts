import {ethers} from 'ethers';

import {truncate} from '../../db-admin/db-admin-connection';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';

import {alice} from './fixtures/participants';

beforeEach(async () => {
  await truncate(knex);
});

describe('signingAddress', () => {
  it('generate address then get address', async () => {
    const signingAddress = await Store.getOrCreateSigningAddress(knex);
    expect(signingAddress).toBeDefined();
    expect(ethers.utils.isAddress(signingAddress)).toBeTruthy();

    const signingAddress2 = await Store.getOrCreateSigningAddress(knex);
    expect(signingAddress).toEqual(signingAddress2);
  });

  it('prepopulated address returned correctly', async () => {
    await seedAlicesSigningWallet(knex);
    const signingAddress = await Store.getOrCreateSigningAddress(knex);
    expect(signingAddress).toEqual(alice().signingAddress);
  });
});
