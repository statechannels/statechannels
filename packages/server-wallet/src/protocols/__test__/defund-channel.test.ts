import {State} from '@statechannels/wallet-core';

import {defaultTestConfig} from '../..';
import {createLogger} from '../../logger';
import {DBDefundChannelObjective} from '../../models/objective';
import {Store} from '../../wallet/store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {channel} from '../../models/__test__/fixtures/channel';
import {Channel} from '../../models/channel';
import {MockChainService} from '../../chain-service';
import {WalletResponse} from '../../wallet/wallet-response';
import {ChannelDefunder} from '../defund-channel';
import {ChallengeStatus} from '../../models/challenge-status';
import {stateVars} from '../../wallet/__test__/fixtures/state-vars';
import {stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';
import {alice, bob} from '../../wallet/__test__/fixtures/signing-wallets';

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

describe('when a channel is finalized on chain', () => {
  it('defunds the channel by calling pushOutcomeAndWithdraw', async () => {
    const c = channel();

    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);
    await ChallengeStatus.insertChallengeStatus(knex, c.channelId, 100, {
      ...c.channelConstants,
      ...stateVars(),
    });
    await ChallengeStatus.setFinalized(knex, c.channelId, 200);
    const obj: DBDefundChannelObjective = {
      type: 'DefundChannel',
      status: 'pending',
      objectiveId: ['DefundChannel', c.channelId].join('-'),
      data: {targetChannelId: c.channelId},
    };

    await knex.transaction(tx => store.ensureObjective(obj, tx));
    await await crankAndAssert(obj, {calls: 'pushOutcomeAndWithdraw', completesObj: true});
  });
  it('if the channel has not been concluded on chain it should call withdrawAndPushOutcome', async () => {
    const c = channel({
      channelNonce: 1,
      vars: [stateWithHashSignedBy([alice(), bob()])({isFinal: true})],
    });

    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    await ChallengeStatus.setFinalized(knex, c.channelId, 200);
    const obj: DBDefundChannelObjective = {
      type: 'DefundChannel',
      status: 'pending',
      objectiveId: ['DefundChannel', c.channelId].join('-'),
      data: {targetChannelId: c.channelId},
    };

    await knex.transaction(tx => store.ensureObjective(obj, tx));
    await await crankAndAssert(obj, {completesObj: true, calls: 'concludeAndWithdraw'});
  });
});
afterEach(async () => {
  await store.dbAdmin().truncateDB();
});

interface AssertionParams {
  challengeState?: State;
  calls: 'pushOutcomeAndWithdraw' | 'concludeAndWithdraw' | 'none';
  completesObj?: boolean;
}

const crankAndAssert = async (
  objective: DBDefundChannelObjective,
  args: AssertionParams
): Promise<void> => {
  const completesObj = args.completesObj || false;

  const chainService = new MockChainService();
  const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);
  const response = WalletResponse.initialize();
  const pushSpy = jest.spyOn(chainService, 'pushOutcomeAndWithdraw');
  const withdrawSpy = jest.spyOn(chainService, 'concludeAndWithdraw');
  await channelDefunder.crank(objective, response);

  if (args.calls === 'none') {
    expect(pushSpy).not.toHaveBeenCalled();
    expect(withdrawSpy).not.toHaveBeenCalled();
  } else if (args.calls === 'pushOutcomeAndWithdraw') {
    if (args.challengeState) {
      expect(pushSpy).toHaveBeenCalledWith(
        expect.objectContaining(args.challengeState),
        expect.anything()
      );
    } else {
      expect(pushSpy).toHaveBeenCalled();
    }
    expect(withdrawSpy).not.toHaveBeenCalled();
  } else {
    expect(withdrawSpy).toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  }

  const reloadedObjective = await store.getObjective(objective.objectiveId);

  if (completesObj) {
    expect(reloadedObjective.status).toEqual('succeeded');
  } else {
    expect(reloadedObjective.status).toEqual('pending');
  }
};
