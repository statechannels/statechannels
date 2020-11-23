import { Channel } from '../../../models/channel';
import { Wallet } from '../..';
import { seedAlicesSigningWallet } from '../../../db/seeds/1_signing_wallet_seeds';
import { stateWithHashSignedBy } from '../fixtures/states';
import { alice, bob } from '../fixtures/signing-wallets';
import { channel } from '../../../models/__test__/fixtures/channel';
import { defaultTestConfig } from '../../../config';
import { Bytes32 } from '../../../type-aliases';

let w: Wallet;
beforeAll(async () => {
  w = Wallet.create(defaultTestConfig);
  await seedAlicesSigningWallet(w.knex);
});

afterAll(async () => {
  await w.destroy();
});

it("signs a final state when it's my turn", async () => {
  const appData = '0x0f00';
  const turnNum = 7;
  const runningState = { turnNum, appData };
  const closingState = { ...runningState, isFinal: true, turnNum: turnNum + 1 };
  const c = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])(runningState)],
  });
  await Channel.query(w.knex).insert(c);

  const channelId = c.channelId;
  const current = await Channel.forId(channelId, w.knex);
  expect(current.protocolState).toMatchObject({ latest: runningState, supported: runningState });

  await expect(w.closeChannel({ channelId })).resolves.toMatchObject({
    outbox: [
      { params: { recipient: 'bob', sender: 'alice', data: { signedStates: [closingState] } } },
    ],
    channelResult: { channelId, status: 'closing', turnNum: turnNum + 1, appData },
  });

  const updated = await Channel.forId(channelId, w.knex);
  expect(updated.protocolState).toMatchObject({ latest: closingState, supported: closingState });
});

it("accepts and sends an objective when it isn't my turn", async () => {
  const appData = '0x0f00';
  const turnNum = 8;
  const runningState = { turnNum, appData, channelNonce: 2 };
  const c = channel({
    channelNonce: 2,
    vars: [stateWithHashSignedBy([alice(), bob()])(runningState)],
  });
  await Channel.query(w.knex).insert(c);

  const channelId = c.channelId;

  await expect(w.closeChannel({ channelId })).resolves.toMatchObject({
    channelResult: { status: 'running' },
    outbox: [
      { method: 'MessageQueued', params: { data: { objectives: [{ type: 'CloseChannel' }] } } },
    ],
  });
});

it("signs a final state when it's my turn for many channels at once", async () => {
  const appData = '0x0f00';
  const turnNum = 7;
  const runningState = { turnNum, appData };

  const channelIds: Bytes32[] = [];

  for (let i = 3; i < 7; i++) {
    const c = channel({
      channelNonce: i,
      vars: [stateWithHashSignedBy([alice(), bob()])({ ...runningState, channelNonce: i })],
    });
    await Channel.query(w.knex).insert(c);
    channelIds.push(c.channelId);
  }

  await expect(w.closeChannels(channelIds)).resolves.toMatchObject({
    channelResults: channelIds.map(_ => ({
      status: 'closing',
      turnNum: turnNum + 1,
      appData,
    })),
  });
});
