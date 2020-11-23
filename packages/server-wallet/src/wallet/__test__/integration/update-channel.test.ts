import { utils } from 'ethers';

import { Channel } from '../../../models/channel';
import { Wallet } from '../..';
import { updateChannelArgs } from '../fixtures/update-channel';
import { seedAlicesSigningWallet } from '../../../db/seeds/1_signing_wallet_seeds';
import { stateWithHashSignedBy } from '../fixtures/states';
import { alice, bob } from '../fixtures/signing-wallets';
import { channel } from '../../../models/__test__/fixtures/channel';
import { defaultTestConfig } from '../../../config';
import { testKnex as knex } from '../../../../jest/knex-setup-teardown';
import { AppBytecode } from '../../../models/app-bytecode';
import {
  appBytecode,
  COUNTING_APP_DEFINITION,
} from '../../../models/__test__/fixtures/app-bytecode';
import { DBAdmin } from '../../../db-admin/db-admin';

let w: Wallet;

afterEach(async () => {
  await w.destroy();
});

const appData1 = utils.defaultAbiCoder.encode(['uint256'], [1]);
const appData2 = utils.defaultAbiCoder.encode(['uint256'], [2]);
beforeEach(async () => {
  w = Wallet.create({ ...defaultTestConfig, skipEvmValidation: false });

  await new DBAdmin(knex).truncateDB();
  await seedAlicesSigningWallet(knex);
  // We seed the counting app bytecode so we can use EVM validation
  await AppBytecode.query(knex).insert([appBytecode()]);
});

it('updates a channel', async () => {
  const c = channel({
    vars: [
      stateWithHashSignedBy([alice(), bob()])({
        turnNum: 5,
        appDefinition: COUNTING_APP_DEFINITION,
        appData: appData1,
      }),
    ],
  });
  await Channel.query(w.knex).insert(c);

  const channelId = c.channelId;
  const current = await Channel.forId(channelId, knex);
  expect(current.latest).toMatchObject({ turnNum: 5, appData: appData1 });

  await expect(w.updateChannel(updateChannelArgs({ appData: appData2 }))).resolves.toMatchObject({
    outbox: [
      {
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: { signedStates: [{ turnNum: 6, appData: appData2 }] },
        },
      },
    ],
    channelResult: { channelId, turnNum: 6, appData: appData2 },
  });

  const updated = await Channel.forId(channelId, knex);
  expect(updated.latest).toMatchObject({ turnNum: 6, appData: appData2 });
});

describe('error cases', () => {
  it('throws when it is not my turn', async () => {
    const c = channel({ vars: [stateWithHashSignedBy([alice(), bob()])({ turnNum: 4 })] });
    await Channel.query(w.knex).insert(c);

    await expect(w.updateChannel(updateChannelArgs())).rejects.toMatchObject(
      Error('it is not my turn')
    );
  });

  it("throws when the channel isn't found", async () => {
    await expect(w.updateChannel(updateChannelArgs())).rejects.toMatchObject(
      Error('channel not found')
    );
  });

  it('throws when it is an invalid app transition', async () => {
    const c = channel({
      vars: [
        stateWithHashSignedBy([alice(), bob()])({
          turnNum: 5,
          appDefinition: COUNTING_APP_DEFINITION,
          appData: appData2,
        }),
      ],
    });
    await Channel.query(w.knex).insert(c);
    await expect(w.updateChannel(updateChannelArgs({ appData: appData1 }))).rejects.toMatchObject(
      Error('Invalid state transition')
    );
  });
});
