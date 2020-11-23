import { constants } from 'ethers';
import { makeAddress } from '@statechannels/wallet-core';

import { AppBytecode } from '../app-bytecode';
import { testKnex as knex } from '../../../jest/knex-setup-teardown';
import { DBAdmin } from '../../db-admin/db-admin';

const CHAIN_ID = '0x01';
const APP_DEFINTION = makeAddress(constants.AddressZero);
const BYTE_CODE1 = '0x01';
const BYTE_CODE2 = '0x02';
describe('AppBytecode model', () => {
  beforeEach(async () => {
    await new DBAdmin(knex).truncateDB();
  });

  afterAll(async () => await knex.destroy());

  it('can insert a bytecode in an empty database', async () => {
    await AppBytecode.upsertBytecode(CHAIN_ID, APP_DEFINTION, BYTE_CODE1, knex);
    const bytecode = await AppBytecode.getBytecode(CHAIN_ID, APP_DEFINTION, knex);
    expect(bytecode).toMatch(BYTE_CODE1);
  });

  it('successfully updates when there is an entry', async () => {
    await AppBytecode.upsertBytecode(CHAIN_ID, APP_DEFINTION, BYTE_CODE1, knex);
    await AppBytecode.upsertBytecode(CHAIN_ID, APP_DEFINTION, BYTE_CODE2, knex);
    const bytecode = await AppBytecode.getBytecode(CHAIN_ID, APP_DEFINTION, knex);
    expect(bytecode).toMatch(BYTE_CODE2);
  });
});
