import _ from 'lodash';
import {SubmitChallenge} from '@statechannels/wallet-core';

import {Store} from '../../wallet/store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {WalletResponse} from '../../wallet/wallet-response';
import {MockChainService} from '../../chain-service';
import {createLogger} from '../../logger';
import {DBSubmitChallengeObjective} from '../../models/objective';
import {ChallengeSubmitter} from '../challenge-submitter';
import {Channel} from '../../models/channel';
import {channel} from '../../models/__test__/fixtures/channel';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {AdjudicatorStatusModel} from '../../models/adjudicator-status';
import {stateSignedBy, stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';
import {alice, bob} from '../../wallet/__test__/fixtures/signing-wallets';
import {ChainServiceRequest} from '../../models/chain-service-request';
import {DBAdmin} from '../../db-admin/db-admin';

const logger = createLogger(defaultTestConfig());
const timingMetrics = false;

let store: Store;
beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );

  await DBAdmin.truncateDataBaseFromKnex(knex);
  await seedAlicesSigningWallet(knex);
});

afterEach(async () => await DBAdmin.truncateDataBaseFromKnex(knex));

describe(`challenge-submitter`, () => {
  it(`takes no action if there is an existing chain service request`, async () => {
    const c = channel();

    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    // Add a existing request
    await ChainServiceRequest.insertOrUpdate(c.channelId, 'challenge', knex);

    const obj: SubmitChallenge = {
      type: 'SubmitChallenge',
      participants: [],
      data: {targetChannelId: c.channelId},
    };

    const dbObjective = await knex.transaction(tx => store.ensureSubmitChallengeObjective(obj, tx));
    await await crankAndAssert(dbObjective, {callsChallenge: false, completesObj: false});
  });
  it(`takes no action if there is an existing challenge`, async () => {
    const c = channel();

    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    const challengeState = stateSignedBy([alice()])();
    await AdjudicatorStatusModel.insertAdjudicatorStatus(knex, c.channelId, 100, [challengeState]);

    const obj: SubmitChallenge = {
      type: 'SubmitChallenge',
      participants: [],
      data: {targetChannelId: c.channelId},
    };

    const objective = await knex.transaction(tx => store.ensureSubmitChallengeObjective(obj, tx));
    await await crankAndAssert(objective, {callsChallenge: false, completesObj: false});
  });

  it(`calls challenge when no challenge exists`, async () => {
    const c = channel({
      vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
      initialSupport: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
    });

    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    const obj: SubmitChallenge = {
      type: 'SubmitChallenge',
      participants: [],
      data: {targetChannelId: c.channelId},
    };

    const objective = await knex.transaction(tx => store.ensureSubmitChallengeObjective(obj, tx));
    await await crankAndAssert(objective, {
      callsChallenge: true,
      completesObj: true,
    });
  });
});

interface AssertionParams {
  callsChallenge?: boolean;
  completesObj?: boolean;
}

const crankAndAssert = async (
  objective: DBSubmitChallengeObjective,
  args: AssertionParams
): Promise<void> => {
  const completesObj = args.completesObj || false;
  const callsChallenge = args.callsChallenge || false;
  const chainService = new MockChainService();
  const challengeSubmitter = ChallengeSubmitter.create(store, chainService, logger, timingMetrics);
  const response = WalletResponse.initialize();
  const spy = jest.spyOn(chainService, 'challenge');
  await challengeSubmitter.crank(objective, response);

  if (callsChallenge) {
    expect(spy).toHaveBeenCalled();
  } else {
    expect(spy).not.toHaveBeenCalled();
  }

  const reloadedObjective = await store.getObjective(objective.objectiveId);

  if (completesObj) {
    expect(reloadedObjective.status).toEqual('succeeded');
  } else {
    expect(reloadedObjective.status).toEqual('pending');
  }
};
