import {constants} from 'ethers';

import {truncate} from '../../db-admin/db-admin-connection';
import {AppBytecode} from '../app-bytecode';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';

const CHAIN_ID = '0x01';
const APP_DEFINTION = constants.AddressZero;
const BYTE_CODE1 = '0x01';
const BYTE_CODE2 = '0x02';
describe('AppBytecode model', () => {
  beforeEach(async () => {
    truncate(knex);
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
    const bytecode = AppBytecode.getBytecode(CHAIN_ID, APP_DEFINTION, knex);
    expect(bytecode).toMatch(BYTE_CODE2);
  });
});
