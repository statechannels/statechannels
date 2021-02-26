import {BN} from '@statechannels/wallet-core';

import {ChannelOpener} from '../channel-opener';
import {Store} from '../../wallet/store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {WalletResponse} from '../../wallet/wallet-response';
import {TestChannel} from '../../wallet/__test__/fixtures/test-channel';
import {MockChainService} from '../../chain-service';
import {createLogger} from '../../logger';
import {DBOpenChannelObjective} from '../../models/objective';
import {ChainServiceRequest, requestTimeout} from '../../models/chain-service-request';
import {DBAdmin} from '../..';

const logger = createLogger(defaultTestConfig());
const timingMetrics = false;
const testChan = TestChannel.create({aBal: 5, bBal: 5});

let store: Store;

beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );
  await DBAdmin.truncateDatabase(defaultTestConfig());
});

afterEach(async () => {
  await DBAdmin.truncateDatabase(defaultTestConfig());
});

describe(`pre-fund-setup phase`, () => {
  describe(`as participant 0`, () => {
    it(`takes no action if I haven't received my opponent's state and I've already signed`, async () => {
      const obj = await setup({participant: 0, statesHeld: [0]});
      await crankAndAssert(obj, {statesToSign: []});
    });
    it(`signs the pre-fund-setup if I have my opponent's state (and deposits)`, async () => {
      const obj = await setup({participant: 0, statesHeld: [1], totalFunds: 0});
      await crankAndAssert(obj, {statesToSign: [0], fundsToDeposit: 5});
    });
  });
  describe(`as participant 1`, () => {
    it(`takes no action if I haven't received my opponent's state and I've already signed`, async () => {
      const obj = await setup({participant: 1, statesHeld: [1], totalFunds: 0});
      await crankAndAssert(obj, {statesToSign: []});
    });
    it(`signs the pre-fund-setup if I have my opponent's state`, async () => {
      const obj = await setup({participant: 1, statesHeld: [0], totalFunds: 0});
      await crankAndAssert(obj, {statesToSign: [1]});
    });
  });
});

describe(`funding phase`, () => {
  describe(`as participant 0`, () => {
    it(`submits the transaction if it is my turn`, async () => {
      const obj = await setup({participant: 0, statesHeld: [0, 1], totalFunds: 0});
      await crankAndAssert(obj, {fundsToDeposit: 5});
      // and then doesn't submit it a second time
      await crankAndAssert(obj, {fundsToDeposit: 0});
      // then let's "wait" for 10 minutes for the fund request to the chain service to get stale
      await ChainServiceRequest.query(knex)
        .findOne({channelId: testChan.channelId})
        .patch({timestamp: new Date(Date.now() - requestTimeout - 10)});
      // we should see a second request to the chain service
      await crankAndAssert(obj, {fundsToDeposit: 5});
      // then let's "wait" for 10 minutes for the fund request to the chain service to get stale
      await ChainServiceRequest.query(knex)
        .findOne({channelId: testChan.channelId})
        .patch({timestamp: new Date(Date.now() - requestTimeout - 10)});
      // we should not see a third request to the chain service as the wallet retries each request just once
      await crankAndAssert(obj, {fundsToDeposit: 0});
    });
    it(`submits a top-up if there's a partial deposit`, async () => {
      const obj = await setup({participant: 0, statesHeld: [0, 1], totalFunds: 2});
      await crankAndAssert(obj, {fundsToDeposit: 3});
      // and then doesn't submit it a second time
      await crankAndAssert(obj, {fundsToDeposit: 0});
    });
    it(`does nothing if I've already deposited`, async () => {
      const obj = await setup({participant: 0, statesHeld: [0, 1], totalFunds: 5});
      await crankAndAssert(obj, {fundsToDeposit: 0});
    });
  });
  describe(`as participant 1`, () => {
    it(`submits the transaction if it is my turn`, async () => {
      const obj = await setup({participant: 1, statesHeld: [0, 1], totalFunds: 5});
      await crankAndAssert(obj, {fundsToDeposit: 5});
      // and then doesn't submit it a second time
      await crankAndAssert(obj, {fundsToDeposit: 0});
    });
    it(`submits a top-up if there's a partial deposit`, async () => {
      const obj = await setup({participant: 1, statesHeld: [0, 1], totalFunds: 7});
      await crankAndAssert(obj, {fundsToDeposit: 3});
      // and then doesn't submit it a second time
      await crankAndAssert(obj, {fundsToDeposit: 0});
    });

    // note: no `does nothing if I've already deposited` test, as it should send the
    // post-fund-setup, which is tested later
  });
});

describe(`post-fund-setup phase`, () => {
  describe(`as participant 0`, () => {
    it(`signs the post-fund-setup if all funds are present`, async () => {
      const obj = await setup({participant: 0, statesHeld: [0, 1], totalFunds: 10});
      await crankAndAssert(obj, {statesToSign: [2]});
    });
    it(`doesn't do anything if I've already signed`, async () => {
      const obj = await setup({participant: 0, statesHeld: [0, 1, 2], totalFunds: 10});
      await crankAndAssert(obj, {statesToSign: []});
    });
    it(`signs the post-fund-setup (and completes objective), when my opponent has signed`, async () => {
      const obj = await setup({participant: 0, statesHeld: [0, 1, 3], totalFunds: 10});
      await crankAndAssert(obj, {statesToSign: [2], completesObj: true});
    });
    it(`marks the objective as complete if a full post-fund-setup exists`, async () => {
      const obj = await setup({participant: 0, statesHeld: [2, 3], totalFunds: 10});
      await crankAndAssert(obj, {completesObj: true});
    });
  });
  describe(`as participant 1`, () => {
    it(`signs the post-fund-setup if all funds are present`, async () => {
      const obj = await setup({participant: 1, statesHeld: [0, 1], totalFunds: 10});
      await crankAndAssert(obj, {statesToSign: [3]});
    });
    it(`doesn't do anything if I've already signed`, async () => {
      const obj = await setup({participant: 1, statesHeld: [0, 1, 3], totalFunds: 10});
      await crankAndAssert(obj, {statesToSign: []});
    });
    it(`signs the post-fund-setup (and completes objective), when my opponent has signed`, async () => {
      const obj = await setup({participant: 1, statesHeld: [0, 1, 2], totalFunds: 10});
      await crankAndAssert(obj, {statesToSign: [3], completesObj: true});
    });
    it(`marks the objective as complete if a full post-fund-setup exists`, async () => {
      const obj = await setup({participant: 1, statesHeld: [2, 3], totalFunds: 10});
      await crankAndAssert(obj, {completesObj: true});
    });
  });
});

interface SetupParams {
  participant: 0 | 1;
  statesHeld: number[];
  totalFunds?: number;
}

const setup = async (args: SetupParams): Promise<DBOpenChannelObjective> => {
  const {participant, statesHeld} = args;
  const totalFunds = args.totalFunds || 0;

  return testChan.insertInto(store, {participant, states: statesHeld, funds: totalFunds});
};

interface AssertionParams {
  statesToSign?: number[];
  fundsToDeposit?: number;
  completesObj?: boolean;
}

const crankAndAssert = async (
  objective: DBOpenChannelObjective,
  args: AssertionParams
): Promise<void> => {
  const statesToSign = args.statesToSign || [];
  const fundsToDeposit = args.fundsToDeposit || 0;
  const completesObj = args.completesObj || false;

  const chainService = new MockChainService();
  const channelOpener = ChannelOpener.create(store, chainService, logger, timingMetrics);
  const response = WalletResponse.initialize();
  const spy = jest.spyOn(chainService, 'fundChannel');
  await store.transaction(async tx => {
    await channelOpener.crank(objective, response, tx);
  });

  // expect there to be an outgoing message in the response
  expect(response._signedStates).toMatchObject(
    statesToSign.map((n: number) => testChan.wireState(Number(n)))
  );
  // check that funds were deposited
  if (fundsToDeposit > 0) {
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({amount: BN.from(fundsToDeposit)}));
  } else {
    expect(spy).not.toHaveBeenCalled();
  }

  const reloadedObjective = await store.getObjective(objective.objectiveId);
  if (completesObj) {
    expect(reloadedObjective.status).toEqual('succeeded');
  } else {
    expect(reloadedObjective.status).toEqual('approved');
  }
};
