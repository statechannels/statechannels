import {ethers} from 'ethers';
import Knex from 'knex';

import {truncate} from '../../db-admin/db-admin-connection';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {SigningWallet} from '../../models/signing-wallet';
import {defaultConfig, extractDBConfigFromServerWalletConfig} from '../../config';

import {alice} from './fixtures/participants';

const knex: Knex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));

beforeEach(async () => {
  await truncate(knex);
});

describe('getFirstParticipant', () => {
  it('works', async () => {
    await expect(SigningWallet.query()).resolves.toHaveLength(0);
    const {signingAddress} = await Store.getFirstParticipant();
    expect(signingAddress).toBeDefined();
    expect(ethers.utils.isAddress(signingAddress)).toBeTruthy();

    const {signingAddress: signingAddress2} = await Store.getFirstParticipant();
    expect(signingAddress).toEqual(signingAddress2);
    await expect(SigningWallet.query()).resolves.toHaveLength(1);
  });

  it('prepopulated address returned correctly', async () => {
    await seedAlicesSigningWallet(knex);
    await expect(SigningWallet.query()).resolves.toHaveLength(1);
    const {signingAddress, participantId} = await Store.getFirstParticipant();
    expect(signingAddress).toEqual(alice().signingAddress);
    expect(participantId).toEqual(alice().signingAddress);
    await expect(SigningWallet.query()).resolves.toHaveLength(1);
  });
});
