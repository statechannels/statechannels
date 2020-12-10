import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {MockChainService} from '../../chain-service';
import {defaultTestConfig} from '../../config';
import {createLogger} from '../../logger';
import {ChainServiceRequest, requestTimeout} from '../../models/chain-service-request';
import {DBCloseChannelObjective} from '../../models/objective';
import {Store} from '../../wallet/store';
import {WalletResponse} from '../../wallet/wallet-response';
import {TestChannel} from '../../wallet/__test__/fixtures/test-channel';
import {ChannelCloser} from '../close-channel';

const FINAL = 10; // this will be A's state to sign
const testChan = TestChannel.create({aBal: 5, bBal: 5, finalFrom: FINAL});

let store: Store;

beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );
  await store.dbAdmin().truncateDB();
});

afterAll(async () => await store.dbAdmin().truncateDB());

describe(`closing phase`, () => {
  it(`waits, if it isn't my turn`, async () => {
    const objective = await setup(testChan, {participant: 0, statesHeld: [7, 8]});
    await crankAndAssert(objective, {statesToSign: []});
  });
  it(`creates and signs the closing state, if it is my turn`, async () => {
    const objective = await setup(testChan, {participant: 0, statesHeld: [8, 9]});
    await crankAndAssert(objective, {statesToSign: [FINAL]});
  });
  it(`double signs the closing state and withdraws, if my opponent has already signed a closing state`, async () => {
    const objective = await setup(testChan, {participant: 1, statesHeld: [9, FINAL]});
    await crankAndAssert(objective, {statesToSign: [FINAL + 1], withdraws: true});
  });
});

describe(`defunding phase (when the channel is closed)`, () => {
  describe(`direct funding`, () => {
    it('submits the withdrawal transaction, and submits once again when it becomes stale, but not a third time', async () => {
      const objective = await setup(testChan, {participant: 0, statesHeld: [FINAL, FINAL + 1]});

      // submit it once
      await crankAndAssert(objective, {withdraws: true});

      // don't submit again
      await crankAndAssert(objective, {withdraws: false});

      // then let's "wait" for the fund request to the chain service to get stale
      await ChainServiceRequest.query(knex)
        .findOne({channelId: testChan.channelId})
        .patch({timestamp: new Date(Date.now() - requestTimeout - 10)});

      // it should submit again
      await crankAndAssert(objective, {withdraws: true});

      // wait until stale again
      await ChainServiceRequest.query(knex)
        .findOne({channelId: testChan.channelId})
        .patch({timestamp: new Date(Date.now() - requestTimeout - 10)});

      // we shouldn't see a third submission
      await crankAndAssert(objective, {withdraws: false});
    });
  });
  describe(`fake funding`, () => {
    it('marks the objective as complete', async () => {
      const testChan = TestChannel.create({finalFrom: FINAL, fundingStrategy: 'Fake'});
      const objective = await setup(testChan, {participant: 0, statesHeld: [FINAL, FINAL + 1]});

      await crankAndAssert(objective, {completesObj: true});
    });
  });
});

interface SetupParams {
  participant: 0 | 1;
  statesHeld: number[];
  totalFunds?: number;
}
const setup = async (
  testChan: TestChannel,
  args: SetupParams
): Promise<DBCloseChannelObjective> => {
  const {participant, statesHeld} = args;
  const totalFunds = args.totalFunds !== undefined ? args.totalFunds : testChan.startBal;

  await testChan.insertInto(store, {
    participant,
    states: statesHeld,
    funds: totalFunds,
  });

  // add the closeChannel objective and approve
  const objective = await store.transaction(async tx => {
    const o = await store.ensureObjective(testChan.closeChannelObjective, tx);
    await store.approveObjective(o.objectiveId, tx);
    return o as DBCloseChannelObjective;
  });

  return objective;
};

interface AssertionParams {
  statesToSign?: number[];
  withdraws?: boolean;
  completesObj?: boolean;
}

const crankAndAssert = async (
  objective: DBCloseChannelObjective,
  args: AssertionParams
): Promise<void> => {
  const statesToSign = args.statesToSign || [];
  const withdraws = args.withdraws || false;
  const completesObj = args.completesObj || false;

  const chainService = new MockChainService();

  const logger = createLogger(defaultTestConfig());
  const timingMetrics = false;
  const channelCloser = ChannelCloser.create(store, chainService, logger, timingMetrics);
  const response = WalletResponse.initialize();
  const spy = jest.spyOn(chainService, 'concludeAndWithdraw');
  await channelCloser.crank(objective, response);

  // expect there to be an outgoing message in the response
  expect(response._signedStates).toMatchObject(
    statesToSign.map((n: number) => testChan.wireState(Number(n)))
  );
  // check that funds were deposited
  if (withdraws) {
    expect(spy).toHaveBeenCalled();
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
