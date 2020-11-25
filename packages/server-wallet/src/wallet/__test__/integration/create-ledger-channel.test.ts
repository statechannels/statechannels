import {constants} from 'ethers';

import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {createChannelArgs} from '../fixtures/create-channel';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {defaultTestConfig, overwriteConfigWithEnvVars} from '../../../config';
import {DBAdmin} from '../../../db-admin/db-admin';

let w: Wallet;
beforeEach(async () => {
  w = Wallet.create(overwriteConfigWithEnvVars(defaultTestConfig));
  await new DBAdmin(w.knex).truncateDB();
});

afterEach(async () => {
  await w.destroy();
});

describe('happy path', () => {
  beforeEach(async () => seedAlicesSigningWallet(w.knex));

  it('creates a ledger channel', async () => {
    expect(await Channel.query(w.knex).resultSize()).toEqual(0);

    const {participants, allocations} = createChannelArgs();

    const createPromise = w.createLedgerChannel({participants, allocations});

    await expect(createPromise).resolves.toMatchObject({
      outbox: [
        {
          params: {
            recipient: 'bob',
            sender: 'alice',
            data: {
              signedStates: [{turnNum: 0}],
              objectives: [
                {
                  participants: [], // TODO: remove when fully deprecated
                  data: {
                    fundingStrategy: 'Direct',
                  },
                  type: 'OpenChannel',
                },
              ],
            },
          },
        },
      ],
      channelResult: {channelId: expect.any(String), turnNum: 0},
    });

    const {channelId} = (await createPromise).channelResult;

    expect(await Channel.query(w.knex).resultSize()).toEqual(1);

    const updated = await Channel.forId(channelId, w.knex);
    const expectedState = {
      turnNum: 0,
      appData: '0x00',
      appDefinition: constants.AddressZero,
    };

    expect(updated).toMatchObject({
      latest: expectedState,
      latestSignedByMe: expectedState,
      supported: undefined,
    });

    await expect(
      w.getLedgerChannels(allocations[0].assetHolderAddress, participants)
    ).resolves.toMatchObject({
      channelResults: [
        {
          channelId,
        },
      ],
    });
  });
});
