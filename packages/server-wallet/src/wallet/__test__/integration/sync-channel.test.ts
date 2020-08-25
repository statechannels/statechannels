import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {truncate} from '../../../db-admin/db-admin-connection';
import knex from '../../../db/connection';
import {stateWithHashSignedBy, stateWithHashSignedBy2} from '../fixtures/states';
import {alice, bob, charlie} from '../fixtures/signing-wallets';
import * as participantFixtures from '../fixtures/participants';
import {channel} from '../../../models/__test__/fixtures/channel';

let w: Wallet;
beforeEach(async () => {
  await truncate(knex);
  w = new Wallet();
});

beforeEach(async () => seedAlicesSigningWallet(knex));

it('returns an outgoing message with the latest state', async () => {
  const appData = '0xf00';
  const turnNum = 7;
  const participants = [
    participantFixtures.alice(),
    participantFixtures.bob(),
    participantFixtures.charlie(),
  ];
  const runningState = {
    turnNum,
    appData,
    participants,
  };
  const nextState = {turnNum: turnNum + 1, appData};
  const c = channel({
    participants,
    vars: [
      stateWithHashSignedBy(alice(), bob(), charlie())(runningState),
      stateWithHashSignedBy(alice())(nextState),
    ],
  });

  const inserted = await Channel.query().insert(c);
  expect(inserted.vars).toMatchObject([runningState, nextState]);

  const channelId = c.channelId;

  await expect(w.syncChannel({channelId, states: []})).resolves.toMatchObject({
    outbox: [
      {
        method: 'MessageQueued',
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {
            objectives: [{type: 'SyncChannel', states: [runningState, nextState]}],
          },
        },
      },
      {
        method: 'MessageQueued',
        params: {
          recipient: 'charlie',
          sender: 'alice',
          data: {
            objectives: [{type: 'SyncChannel', states: [runningState, nextState]}],
          },
        },
      },
    ],
    channelResult: runningState,
  });

  const updated = await Channel.forId(channelId, undefined);
  expect(updated.protocolState).toMatchObject({latest: runningState, supported: runningState});
});

it('pushes states included in the API call', async () => {
  const appData = '0xf00';
  const turnNum = 8;
  const runningState = {
    turnNum,
    appData,
  };
  const nextState = {turnNum: turnNum + 1, appData};
  const supportedState = stateWithHashSignedBy2([alice(), bob()])(runningState);
  const nextSignedByAlice = stateWithHashSignedBy2([alice()])(nextState);
  const nextSignedByBob = stateWithHashSignedBy2([bob()])(nextState);
  const nextSignedByBoth = stateWithHashSignedBy2([bob(), alice()])(nextState);

  const c = channel({vars: [supportedState, nextSignedByAlice]});

  const inserted = await Channel.query().insert(c);
  expect(inserted.vars).toMatchObject([runningState, nextSignedByAlice]);

  const channelId = c.channelId;
  await w.syncChannel({channelId, states: [nextSignedByBob]});

  const after = await Channel.forId(channelId, undefined);

  expect(after.protocolState.supported?.turnNum).toEqual(turnNum + 1);

  await expect(w.syncChannel({channelId, states: [nextSignedByBob]})).resolves.toMatchObject({
    outbox: [
      {
        method: 'MessageQueued',
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {
            objectives: [
              {
                type: 'SyncChannel',
                states: [
                  {
                    ...nextState,
                    signatures: [
                      {signer: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9'},
                      {signer: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf'},
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ],
    channelResult: nextState,
  });

  const updated = await Channel.forId(channelId, undefined);
  expect(updated.protocolState).toMatchObject({
    latest: nextSignedByBoth,
    supported: nextSignedByBoth,
  });
});

it('reject when the channel is not known', async () => {
  await expect(w.syncChannel({channelId: '0xf00', states: []})).rejects.toMatchObject(
    new Error('Channel not found')
  );
});
