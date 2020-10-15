import {
  simpleEthAllocation,
  serializeOutcome,
  BN,
  serializeState,
  serializeAllocation,
  isSimpleAllocation,
  checkThat,
} from '@statechannels/wallet-core';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/lib/src/config';

import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {seedBobsSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {stateWithHashSignedBy} from '../fixtures/states';
import {bob, alice} from '../fixtures/signing-wallets';
import {alice as aliceP, bob as bobP} from '../fixtures/participants';
import {channel} from '../../../models/__test__/fixtures/channel';
import {defaultTestConfig} from '../../../config';
import {DBAdmin} from '../../../db-admin/db-admin';
import {Objective as ObjectiveModel} from '../../../models/objective';

let w: Wallet;
beforeEach(async () => {
  w = new Wallet(defaultTestConfig);
  await new DBAdmin(w.knex).truncateDB();
  await seedBobsSigningWallet(w.knex);
});

afterEach(async () => {
  await w.destroy();
});

describe('directly funded app', () => {
  it('signs multiple prefund setups when joining multiple channels', async () => {
    const appData = '0x0f00';
    const preFS = {turnNum: 0, appData};
    const state1 = {...preFS, channelNonce: 1};
    const state2 = {...preFS, channelNonce: 2};

    const c1 = channel({
      signingAddress: bob().address,
      channelNonce: 1,
      vars: [stateWithHashSignedBy(alice())(state1)],
    });

    await Channel.query(w.knex).insert(c1);
    const c2 = channel({
      signingAddress: bob().address,
      channelNonce: 2,
      vars: [stateWithHashSignedBy(alice())(state2)],
    });

    await Channel.query(w.knex).insert(c2);
    const channelIds = [c1, c2].map(c => c.channelId);

    await ObjectiveModel.insert(
      {
        type: 'OpenChannel',
        participants: c1.participants,
        data: {
          targetChannelId: c1.channelId,
          fundingStrategy: 'Direct',
        },
        status: 'pending',
      },
      w.knex
    );

    await ObjectiveModel.insert(
      {
        type: 'OpenChannel',
        participants: c2.participants,
        data: {
          targetChannelId: c2.channelId,
          fundingStrategy: 'Direct',
        },
        status: 'pending',
      },
      w.knex
    );

    const result = await w.joinChannels(channelIds);
    expect(result).toMatchObject({
      outbox: [
        {
          params: {
            recipient: 'alice',
            sender: 'bob',
            data: {
              signedStates: [
                {...state1, turnNum: 1},
                {...state2, turnNum: 1},
              ],
            },
          },
        },
      ],
      channelResults: [{channelId: c1.channelId}, {channelId: c2.channelId}],
    });

    await Promise.all(
      channelIds.map(async c => {
        const updated = await Channel.forId(c, w.knex);
        expect(updated.protocolState).toMatchObject({
          latest: {turnNum: 1},
          supported: {turnNum: 1},
        });
      })
    );
  });

  it('signs the prefund setup ', async () => {
    const appData = '0x0f00';
    const preFS0 = {turnNum: 0, appData};
    const preFS1 = {turnNum: 1, appData};
    const c = channel({
      signingAddress: bob().address,
      vars: [stateWithHashSignedBy(alice())(preFS0)],
    });
    await Channel.query(w.knex).insert(c);
    const {channelId} = c;
    const current = await Channel.forId(channelId, w.knex);

    expect(current.protocolState).toMatchObject({latest: preFS0, supported: undefined});

    await ObjectiveModel.insert(
      {
        type: 'OpenChannel',
        participants: current.participants,
        data: {
          targetChannelId: current.channelId,
          fundingStrategy: 'Direct',
        },
        status: 'pending',
      },
      w.knex
    );

    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [{params: {recipient: 'alice', sender: 'bob', data: {signedStates: [preFS1]}}}],
      channelResult: {channelId, turnNum: 1, appData, status: 'opening'},
    });

    const updated = await Channel.forId(channelId, w.knex);

    expect(updated.protocolState).toMatchObject({latest: preFS1, supported: preFS1});
  });

  it('signs the prefund setup and makes a deposit, when I am first to deposit in a directly funded app', async () => {
    const outcome = simpleEthAllocation([{destination: bobP().destination, amount: BN.from(5)}]);
    const preFS0 = {turnNum: 0, outcome};
    const preFS1 = {turnNum: 1, outcome};

    const c = channel({
      signingAddress: bob().address,
      vars: [stateWithHashSignedBy(alice())(preFS0)],
    });
    await Channel.query(w.knex).insert(c);

    const channelId = c.channelId;
    const current = await Channel.forId(channelId, w.knex);
    expect(current.latest).toMatchObject(preFS0);

    await ObjectiveModel.insert(
      {
        type: 'OpenChannel',
        participants: current.participants,
        data: {
          targetChannelId: current.channelId,
          fundingStrategy: 'Direct',
        },
        status: 'pending',
      },
      w.knex
    );

    w.store.objectives[current.channelNonce] = {
      type: 'OpenChannel',
      participants: current.participants,
      data: {
        targetChannelId: current.channelId,
        fundingStrategy: 'Direct',
      },
      status: 'pending',
      objectiveId: current.channelNonce,
    };

    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {
            recipient: 'alice',
            sender: 'bob',
            data: {signedStates: [{...preFS1, outcome: serializeOutcome(preFS1.outcome)}]},
          },
        },
      ],
      channelResult: {channelId, turnNum: 1, status: 'opening'},
    });

    const updated = await Channel.forId(channelId, w.knex);
    expect(updated.protocolState).toMatchObject({
      latest: preFS1,
      supported: preFS1,
      chainServiceRequests: ['fund'],
    });
  });
});

describe('ledger funded app', () => {
  beforeEach(async () => {
    // NOTE: Put a ledger Channel in the DB
    const ledger = await Channel.query(w.knex).insert(
      channel({
        signingAddress: bob().address,
        channelNonce: 3,
        vars: [
          stateWithHashSignedBy(alice())({
            turnNum: 4,
            outcome: simpleEthAllocation([{destination: bobP().destination, amount: BN.from(5)}]),
          }),
        ],
      })
    );
    w.__setLedger(ledger.channelId, ETH_ASSET_HOLDER_ADDRESS);
  });

  const placeChannelInDatabase = async (c: Channel) => {
    const current = await Channel.query(w.knex).insert(c);
    w.store.objectives[current.channelNonce] = {
      type: 'OpenChannel',
      participants: current.participants,
      data: {
        targetChannelId: current.channelId,
        fundingStrategy: 'Ledger',
      },
      status: 'pending',
      objectiveId: current.channelNonce,
    };
    return current;
  };

  it('signs the prefund setup', async () => {
    const outcome = simpleEthAllocation([{destination: bobP().destination, amount: BN.from(5)}]);
    const preFS0 = {turnNum: 0, outcome};
    const preFS1 = {turnNum: 1, outcome};

    const {channelId} = await placeChannelInDatabase(
      channel({
        signingAddress: bob().address,
        fundingStrategy: 'Ledger',
        vars: [stateWithHashSignedBy(alice())(preFS0)],
      })
    );

    const signedPreFS1 = stateWithHashSignedBy(bob())(preFS1);

    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {
            recipient: 'alice',
            sender: 'bob',
            data: {
              signedStates: [serializeState(signedPreFS1)],
            },
          },
        },
      ],
      channelResult: {
        channelId,
        turnNum: 1,
        allocations: serializeAllocation(outcome),
        status: 'opening',
      },
    });

    const {protocolState} = await Channel.forId(channelId, w.knex);

    expect(protocolState).toMatchObject({
      latest: signedPreFS1,
      supported: signedPreFS1,
    });
  });
});
