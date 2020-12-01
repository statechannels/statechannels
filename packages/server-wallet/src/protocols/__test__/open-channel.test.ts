import matchers from '@pacote/jest-either';
import {BN} from '@statechannels/wallet-core';

import {ChannelOpener} from '../open-channel';
import {Store} from '../../wallet/store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {WalletResponse} from '../../wallet/wallet-response';
import {TestChannel} from '../../wallet/__test__/fixtures/test-channel';
import {MockChainService} from '../../chain-service';
import {createLogger} from '../../logger';
import {DBOpenChannelObjective} from '../../models/objective';

expect.extend(matchers);

const logger = createLogger(defaultTestConfig);
const timingMetrics = false;
const testChan = TestChannel.create(5, 5);

let store: Store;

beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestConfig.metricsConfiguration.timingMetrics,
    defaultTestConfig.skipEvmValidation,
    '0'
  );
  await store.dbAdmin().truncateDB();
});

afterEach(async () => await store.dbAdmin().truncateDB());

describe(`pre-fund-setup phase`, () => {
  describe(`as participant 0`, () => {
    it(`takes no action if I haven't received my opponent's state and I've already signed`, async () => {
      await testCase({participant: 0, statesHeld: [0], statesToSign: []});
    });
    it(`signs the pre-fund-setup if I have my opponent's state (and deposits)`, async () => {
      await testCase({participant: 0, statesHeld: [1], statesToSign: [0], fundsToDeposit: 5});
    });
  });
  describe(`as participant 1`, () => {
    it(`takes no action if I haven't received my opponent's state and I've already signed`, async () => {
      await testCase({participant: 1, statesHeld: [1], statesToSign: []});
    });
    it(`signs the pre-fund-setup if I have my opponent's state`, async () => {
      await testCase({participant: 1, statesHeld: [0], statesToSign: [1]});
    });
  });
});

describe(`funding phase`, () => {
  const statesHeld = [0, 1];

  describe(`as participant 0`, () => {
    it(`submits the transaction if it is my turn`, async () => {
      const o = await testCase({participant: 0, statesHeld, totalFunds: 0, fundsToDeposit: 5});
      // and then doesn't submit it a second time
      await testCrankOutcome(o, {fundsToDeposit: 0});
    });
    it(`submits a top-up if there's a partial deposit`, async () => {
      const o = await testCase({participant: 0, statesHeld, totalFunds: 2, fundsToDeposit: 3});
      // and then doesn't submit it a second time
      await testCrankOutcome(o, {fundsToDeposit: 0});
    });
    it(`does nothing if I've already deposited`, async () => {
      await testCase({participant: 0, statesHeld, totalFunds: 5, fundsToDeposit: 0});
    });
  });
  describe(`as participant 1`, () => {
    it(`submits the transaction if it is my turn`, async () => {
      const o = await testCase({participant: 1, statesHeld, totalFunds: 5, fundsToDeposit: 5});
      // and then doesn't submit it a second time
      await testCrankOutcome(o, {fundsToDeposit: 0});
    });
    it(`submits a top-up if there's a partial deposit`, async () => {
      const o = await testCase({participant: 1, statesHeld, totalFunds: 7, fundsToDeposit: 3});
      // and then doesn't submit it a second time
      await testCrankOutcome(o, {fundsToDeposit: 0});
    });
    it.skip(`does nothing if I've already deposited`, async () => {
      // todo: this fails, as it sends the post-fund-setup (as it probably should)
      await testCase({participant: 1, statesHeld, totalFunds: 10, fundsToDeposit: 0});
    });
  });
});

describe(`post-fund-setup phase`, () => {
  describe(`as participant 0`, () => {
    it(`signs the post-fund-setup if all funds are present`, async () => {
      await testCase({participant: 0, statesHeld: [0, 1], totalFunds: 10, statesToSign: [2]});
    });
    it(`doesn't do anything if I've already signed`, async () => {
      await testCase({participant: 0, statesHeld: [0, 1, 2], totalFunds: 10, statesToSign: []});
    });
    it(`signs the post-fund-setup (and completes objective), when my opponent has signed`, async () => {
      await testCase({
        participant: 0,
        statesHeld: [0, 1, 3],
        totalFunds: 10,
        statesToSign: [2],
        completesObj: true,
      });
      // todo: and marks the objective as complete
    });
    it(`marks the objective as complete if a full post-fund-setup exists`, async () => {
      await testCase({participant: 0, statesHeld: [2, 3], totalFunds: 10, completesObj: true});
    });
  });
  describe(`as participant 1`, () => {
    it(`signs the post-fund-setup if all funds are present`, async () => {
      // todo: should it do this, or should it wait for my turn
      await testCase({participant: 1, statesHeld: [0, 1], totalFunds: 10, statesToSign: [3]});
    });
    it(`doesn't do anything if I've already signed`, async () => {
      await testCase({participant: 1, statesHeld: [0, 1, 3], totalFunds: 10, statesToSign: []});
      // todo: and marks the objective as complete
    });
    it(`signs the post-fund-setup (and completes objective), when my opponent has signed`, async () => {
      await testCase({
        participant: 1,
        statesHeld: [0, 1, 2],
        totalFunds: 10,
        statesToSign: [3],
        completesObj: true,
      });
    });
    it(`marks the objective as complete if a full post-fund-setup exists`, async () => {
      await testCase({participant: 1, statesHeld: [2, 3], totalFunds: 10, completesObj: true});
    });
  });
});

type TestCaseParams = SetupParams & AssertionParams;

const testCase = async (args: TestCaseParams): Promise<DBOpenChannelObjective> => {
  const objective = await setup(args);
  await testCrankOutcome(objective, args);
  return objective;
};

interface SetupParams {
  participant: 0 | 1;
  statesHeld: number[];
  totalFunds?: number;
}
const setup = async (args: SetupParams): Promise<DBOpenChannelObjective> => {
  const {participant, statesHeld} = args;
  const totalFunds = args.totalFunds || 0;

  // load the signingKey for the appopriate participant
  await store.addSigningKey(testChan.signingKeys[participant]);
  // load in the states
  for (const stateNum of statesHeld) {
    await store.pushMessage(testChan.wirePayload(Number(stateNum)));
  }
  // set the funds as specified
  if (totalFunds > 0) {
    await store.updateFunding(testChan.channelId, BN.from(totalFunds), testChan.assetHolderAddress);
  }

  // add the openChannel objective and approve
  const objective = await store.transaction(async tx => {
    const o = await store.ensureObjective(testChan.openChannelObjective, tx);
    await store.approveObjective(o.objectiveId, tx);
    return o as DBOpenChannelObjective;
  });

  return objective;
};

interface AssertionParams {
  statesToSign?: number[];
  fundsToDeposit?: number;
  completesObj?: boolean;
}

const testCrankOutcome = async (
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
  await channelOpener.crank(objective, response);

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
