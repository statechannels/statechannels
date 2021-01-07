import {State} from '@statechannels/wallet-core';

import {Store} from '../../wallet/store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {WalletResponse} from '../../wallet/wallet-response';
import {MockChainService} from '../../chain-service';
import {createLogger} from '../../logger';
import {DBSubmitChallengeObjective} from '../../models/objective';
import {ChallengeSubmitter} from '../challenge-submitter';
import {stateVars} from '../../wallet/__test__/fixtures/state-vars';
import {Channel} from '../../models/channel';
import {channel} from '../../models/__test__/fixtures/channel';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {ChallengeStatus} from '../../models/challenge-status';

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

  await store.dbAdmin().truncateDB();
  await seedAlicesSigningWallet(knex);
});

afterEach(async () => await store.dbAdmin().truncateDB());

describe(`challenge-submitter`, () => {
  it(`takes no action if there is an existing challenge`, async () => {
    const c = channel();
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    await ChallengeStatus.updateChallengeStatus(knex, c.channelId, 100, 200);
    const state: State = {...c.channelConstants, ...stateVars()};

    const obj: DBSubmitChallengeObjective = {
      type: 'SubmitChallenge',
      status: 'pending',
      objectiveId: ['SubmitChallenge', c.channelId].join('-'),
      data: {challengeState: state, targetChannelId: c.channelId},
    };

    await knex.transaction(tx => store.ensureObjective(obj, tx));
    await await crankAndAssert(obj, {callsChallenge: false, completesObj: false});
  });

  it(`calls challenge when no challenge exists`, async () => {
    const c = channel();
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    const state: State = {...c.channelConstants, ...stateVars()};

    const obj: DBSubmitChallengeObjective = {
      type: 'SubmitChallenge',
      status: 'pending',
      objectiveId: ['SubmitChallenge', c.channelId].join('-'),
      data: {challengeState: state, targetChannelId: c.channelId},
    };

    await knex.transaction(tx => store.ensureObjective(obj, tx));
    await await crankAndAssert(obj, {
      callsChallenge: true,
      challengeState: state,
      completesObj: true,
    });
  });
});

interface AssertionParams {
  challengeState?: State;
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
    if (args.challengeState) {
      expect(spy).toHaveBeenCalledWith(
        [expect.objectContaining(args.challengeState)],
        expect.anything()
      );
    } else {
      expect(spy).toHaveBeenCalled();
    }
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
