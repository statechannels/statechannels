import {BN} from '@statechannels/wallet-core';

import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {Store} from '../../wallet/store';
import {WalletResponse} from '../../wallet/wallet-response';
import {TestChannel} from '../../wallet/__test__/fixtures/test-channel';
import {TestLedgerChannel} from '../../wallet/__test__/fixtures/test-ledger-channel';
import {SingleAppUpdater} from '../single-app-updater';

const FINAL = 8;
const testChan = TestChannel.create({channelNonce: 1, finalFrom: FINAL});
const testChan2 = TestChannel.create({channelNonce: 2});

let store: Store;
let singleAppUpdater: SingleAppUpdater;
let response: WalletResponse;

beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );
  await store.dbAdmin().truncateDB();
  await store.dbAdmin().migrateDB();
  singleAppUpdater = SingleAppUpdater.create(store);
  response = WalletResponse.initialize();
});

afterEach(async () => await store.dbAdmin().truncateDB());

describe('when given an update for a single, running app channel', () => {
  it(`updates the channel`, async () => {
    // put state5 and state6 in the store
    await setup({states: [testChan.wirePayload(5), testChan.wirePayload(6)]});

    // send state7
    await singleAppUpdater.update(testChan.wirePayload(7), response);

    // expect to find state7 in the output
    expect(response.singleChannelOutput().channelResult.turnNum).toEqual(7);
  });
});

describe('bad payload', () => {
  const state0WithObj = testChan.openChannelPayload;
  const getRequest = TestChannel.mergePayloads(testChan.wirePayload(7), testChan.getChannelRequest);
  const twoStates = TestChannel.mergePayloads(testChan.wirePayload(7), testChan2.wirePayload(7));
  const emptyPayload = TestChannel.emptyPayload;

  it.each`
    case                 | payload          | error
    ${'multiple states'} | ${twoStates}     | ${`The payload sent to pushUpdate must contain exactly 1 signedState.`}
    ${'no states'}       | ${emptyPayload}  | ${`The payload sent to pushUpdate must contain exactly 1 signedState.`}
    ${'an objective'}    | ${state0WithObj} | ${`The payload sent to pushUpdate must not contain objectives.`}
    ${'a request'}       | ${getRequest}    | ${`The payload sent to pushUpdate must not contain requests.`}
  `('errors when given $case', async ({payload, error}) => {
    await expect(singleAppUpdater.update(payload, response)).rejects.toThrow(error);
  });
});

describe('app channel not running', () => {
  it(`errors if the channel is still opening`, async () => {
    // put state0 and state1 in the store
    await setup({states: [testChan.wirePayload(0), testChan.wirePayload(1)]});

    // send state2
    await expect(singleAppUpdater.update(testChan.wirePayload(2), response)).rejects.toThrow(
      'The update sent to pushUpdate must be for a running channel'
    );
  });
  it(`errors if the channel has a final state`, async () => {
    // put state7 and state8final in the store
    await setup({
      states: [testChan.wirePayload(FINAL - 1), testChan.wirePayload(FINAL, [5, 5])],
    });

    // send state9final
    await expect(
      singleAppUpdater.update(testChan.wirePayload(FINAL + 1, [5, 5]), response)
    ).rejects.toThrow('The update sent to pushUpdate must be for a running channel');
  });
  it(`errors if given a first final state`, async () => {
    await setup({
      states: [testChan.wirePayload(FINAL - 2), testChan.wirePayload(FINAL - 1, [5, 5])],
    });

    // send state7final
    await expect(
      singleAppUpdater.update(testChan.wirePayload(FINAL, [5, 5]), response)
    ).rejects.toThrow('The update sent to pushUpdate must be for a running channel');
  });
});

describe('not an app channel', () => {
  it(`errors if the channel is a ledger channel`, async () => {
    // want a running ledger channel
    const testLedger = TestLedgerChannel.create({aBal: 5, bBal: 5, channelNonce: 3});
    await testLedger.insertIntoStore(store);

    await store.pushMessage(testLedger.wirePayload(5));
    await store.pushMessage(testLedger.wirePayload(6));
    await store.updateFunding(testLedger.channelId, BN.from(10), testLedger.assetHolderAddress);

    await expect(singleAppUpdater.update(testLedger.wirePayload(7), response)).rejects.toThrow(
      'The update sent to pushUpdate must be for an application channel'
    );
  });
});

interface SetupParams {
  states: any[];
}

const setup = async ({states}: SetupParams): Promise<void> => {
  await store.addSigningKey(testChan.signingKeyA);
  for (const state of states) {
    await store.pushMessage(state);
  }
  await store.updateFunding(testChan.channelId, BN.from(10), testChan.assetHolderAddress);
};
