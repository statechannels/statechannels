import _ from 'lodash';
import {
  AllocationItem,
  BN,
  makeDestination,
  Participant,
  serializeRequest,
  SimpleAllocation,
  simpleEthAllocation as coreSimpleEthAllocation,
} from '@statechannels/wallet-core';

import {channel} from '../../models/__test__/fixtures/channel';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {alice as aliceSW, bob as bobSW} from '../../wallet/__test__/fixtures/signing-wallets';
import {stateSignedBy} from '../../wallet/__test__/fixtures/states';
import {Fixture} from '../../wallet/__test__/fixtures/utils';
import {ChannelStateWithSupported} from '../state';
import {LedgerManager, protocol, ProtocolState} from '../ledger-manager';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {TestChannel} from '../../wallet/__test__/fixtures/test-channel';
import {Store} from '../../wallet/store';
import {TestLedgerChannel} from '../../wallet/__test__/fixtures/test-ledger-channel';
import {WalletResponse} from '../../wallet/wallet-response';
import {createLogger} from '../../logger';
import {LedgerRequestType} from '../../models/ledger-request';
import {getPayloadFor} from '../../__test__/test-helpers';
import {ProposeLedgerUpdate} from '../actions';

// TEST HELPERS
// There are many test cases in this file. These helpers make the tests cases more readable.

type PreAllocationItem = [string | Fixture<Participant>, number];

function allocationItem(preAllocationItem: PreAllocationItem): AllocationItem {
  const [destinationOrFixture, amount] = preAllocationItem;
  const destination =
    typeof destinationOrFixture === 'string'
      ? makeDestination(destinationOrFixture)
      : destinationOrFixture().destination;
  return {destination, amount: BN.from(amount)};
}

function simpleEthAllocation(...items: PreAllocationItem[]): SimpleAllocation {
  return coreSimpleEthAllocation(items.map(allocationItem));
}

let i = 0;
const prefundChannelWithAllocations = (...allocations: PreAllocationItem[]) =>
  channel({
    channelNonce: i++, // Unique channel id each time this fixture is used
    fundingStrategy: 'Ledger',
    vars: [
      stateSignedBy([aliceSW(), bobSW()])({
        turnNum: 1,
        outcome: simpleEthAllocation(...allocations),
      }),
    ],
  });

const ledgerChannelWithAllocations = (...allocations: PreAllocationItem[]) =>
  channel({
    vars: [
      stateSignedBy([aliceSW(), bobSW()])({
        turnNum: 3,
        outcome: simpleEthAllocation(...allocations),
      }),
    ],
  }).protocolState as ChannelStateWithSupported;
// END TEST HELPERS

const defaultLedgerChannel = ledgerChannelWithAllocations([alice, 10], [bob, 10]);

// const unfundedLedgerChannel = ledgerChannelWithAllocations([]);

const processLedgerQueueProtocolState = (args: Partial<ProtocolState> = {}) => ({
  fundingChannel: defaultLedgerChannel,

  channelsRequestingFunds: [],
  channelsReturningFunds: [],

  theirLedgerProposal: {proposal: null, nonce: 0},

  myLedgerProposal: {proposal: null, nonce: 0},

  ...args,
});

let store: Store;
let ledgerManager: LedgerManager;

beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0',
    createLogger(defaultTestConfig())
  );
  ledgerManager = LedgerManager.create({
    store,
    logger: store.logger,
    timingMetrics: defaultTestConfig().metricsConfiguration.timingMetrics,
  });
  await store.dbAdmin().truncateDB();
});

afterEach(async () => {
  await store.dbAdmin().truncateDB();
});

describe('marking ledger requests as complete', () => {
  it('takes no action if there are no ledger requests', () => {
    expect(protocol(processLedgerQueueProtocolState())).toBeUndefined();
  });

  it('detects completed funding requests from the outcome of supported state', async () => {
    // create an application channel
    const appChannel = TestChannel.create({aBal: 5, bBal: 5});
    await appChannel.insertInto(store, {states: [0, 1]});
    // create a ledger channel that funds that channel.Note distinct channel nonce should be automatically ensured automatically
    const ledgerChannel = TestLedgerChannel.create({channelNonce: 1});
    await ledgerChannel.insertInto(store, {
      states: [4, 5],
      bals: [[appChannel.channelId, 10]],
    });
    // create a ledger request for the ledger to fund the channel
    await ledgerChannel.insertFundingRequest(store, appChannel.channelId);

    // crank the ledger manager
    await ledgerManager.crank(ledgerChannel.channelId, new WalletResponse());
    // assert that it marks the request as complete
    expect(
      await store.getLedgerRequest(appChannel.channelId, 'fund')
    ).toMatchObject<LedgerRequestType>({
      type: 'fund',
      ledgerChannelId: ledgerChannel.channelId,
      channelToBeFunded: appChannel.channelId,
      status: 'succeeded',
    });
  });

  it('detects completed defunding requests from the outcome of supported state', async () => {
    // create an application channel
    const appChannel = TestChannel.create({aBal: 5, bBal: 5});
    await appChannel.insertInto(store, {states: [0, 1]});
    // create a ledger channel whose current state doesn't fund that channel. Note distinct channel nonce should be automatically ensuredd automatically
    const ledgerChannel = TestLedgerChannel.create({});
    await ledgerChannel.insertInto(store, {
      states: [5, 6],
      bals: [
        [appChannel.participantA.destination, 5],
        [appChannel.participantB.destination, 5],
      ],
    });
    // create a ledger request for the ledger to defund the channel
    await ledgerChannel.insertDefundingRequest(store, appChannel.channelId);

    // crank the ledger manager
    await ledgerManager.crank(ledgerChannel.channelId, new WalletResponse());
    // assert that it marks the request as complete
    expect(
      await store.getLedgerRequest(appChannel.channelId, 'defund')
    ).toMatchObject<LedgerRequestType>({
      type: 'defund',
      ledgerChannelId: ledgerChannel.channelId,
      channelToBeFunded: appChannel.channelId,
      status: 'succeeded',
    });
  });
});

describe('exchanging ledger proposals', () => {
  describe('as initial proposer', () => {
    it('takes no action if proposal is identical to existing supported outcome', () => {
      const requestChannel = prefundChannelWithAllocations(); // Empty outcome
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toBeUndefined();
    });

    it('takes no action if proposal exists but counterparties does not', () => {
      const requestChannel = prefundChannelWithAllocations([alice, 1]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        myLedgerProposal: {
          proposal: simpleEthAllocation([alice, 9], [bob, 10], [requestChannel.channelId, 1]),
          nonce: 0,
        },
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toBeUndefined();
    });

    it('proposes new outcome funding 1 channel, exhaussting 100% of funds', async () => {
      // create an application channel
      const appChannel = TestChannel.create({aBal: 5, bBal: 5});
      await appChannel.insertInto(store, {states: [0, 1]});
      // create a ledger channel whose current state doesn't fund that channel. Note distinct channel nonce should be automatically ensured automatically
      const ledgerChannel = TestLedgerChannel.create({});
      await ledgerChannel.insertInto(store, {
        // Will be "fully funded" i.e. with 10 coins
        states: [4, 5],
        bals: [
          [appChannel.participantA.destination, 5],
          [appChannel.participantB.destination, 5],
        ],
      });
      // create a ledger request for the ledger to fund the channel
      await ledgerChannel.insertFundingRequest(store, appChannel.channelId);

      // crank the ledger manager
      const response = new WalletResponse();
      await ledgerManager.crank(ledgerChannel.channelId, response);

      // assert that there is a proposal in the outbox
      const payload = getPayloadFor(
        ledgerChannel.participantB.participantId,
        response.multipleChannelOutput().outbox
      );
      const expectedProposeLedgerUpdate: ProposeLedgerUpdate = {
        type: 'ProposeLedgerUpdate',
        nonce: 1,
        channelId: ledgerChannel.channelId,
        outcome: simpleEthAllocation([appChannel.channelId, 10]),
        signingAddress: ledgerChannel.participantA.signingAddress,
      };
      expect(payload).toMatchObject({
        requests: [serializeRequest(expectedProposeLedgerUpdate)],
      });
    });

    it('proposes new outcome funding many channels', async () => {
      // create and insert a funded ledger channel that doesn't fund any channels yet. Note distinct channel nonce should be automatically ensured automatically
      const ledgerChannel = TestLedgerChannel.create({});
      await ledgerChannel.insertInto(store, {
        states: [4, 5],
        bals: [10, 10],
      });

      // create 5 application channels, each allocating 1 to Alice
      const appChannels = [0, 1, 2, 3, 4].map(() => TestChannel.create({aBal: 1, bBal: 0}));
      for await (const appChannel of appChannels) {
        // for each one, insert the channel and a ledger funding request
        await appChannel.insertInto(store, {states: [0, 1]});
        await ledgerChannel.insertFundingRequest(store, appChannel.channelId);
      }

      // crank the ledger manager
      const response = new WalletResponse();
      await ledgerManager.crank(ledgerChannel.channelId, response);

      // assert that there is a proposal funding all of those channels in the outbox
      const payload = getPayloadFor(
        ledgerChannel.participantB.participantId,
        response.multipleChannelOutput().outbox
      );
      const expectedProposeLedgerUpdate: ProposeLedgerUpdate = {
        type: 'ProposeLedgerUpdate',
        nonce: 1,
        channelId: ledgerChannel.channelId,
        outcome: simpleEthAllocation(
          [alice, 5],
          [bob, 10],
          ...appChannels.map(c => [c.channelId, c.startBal] as [string, number])
        ),
        signingAddress: ledgerChannel.participantA.signingAddress,
      };
      expect(payload).toMatchObject({
        requests: [serializeRequest(expectedProposeLedgerUpdate)],
      });
    });

    it('proposes new outcome requiring defund before having sufficient funds', async () => {
      // setup a ledger channel funding an 'older' channel
      const ledgerChannel = TestLedgerChannel.create({});
      const olderChannel = TestChannel.create({aBal: 10, bBal: 0});
      await ledgerChannel.insertInto(store, {
        states: [4, 5],
        bals: [[olderChannel.channelId, 10]],
      });
      await olderChannel.insertInto(store, {states: [0, 1]});

      // create a new channel
      const newChannel = TestChannel.create({aBal: 10, bBal: 0});
      await newChannel.insertInto(store, {states: [0, 1]});

      // create a ledger request for the ledger to defund the older channel
      await ledgerChannel.insertDefundingRequest(store, olderChannel.channelId);
      // create a ledger request for the ledger to fund the new channel
      await ledgerChannel.insertFundingRequest(store, newChannel.channelId);

      // crank the ledger manager
      const response = new WalletResponse();
      await ledgerManager.crank(ledgerChannel.channelId, response);

      // assert that there is a proposal funding the new channel in the outbox
      const payload = getPayloadFor(
        ledgerChannel.participantB.participantId,
        response.multipleChannelOutput().outbox
      );
      const expectedProposeLedgerUpdate: ProposeLedgerUpdate = {
        type: 'ProposeLedgerUpdate',
        nonce: 1,
        channelId: ledgerChannel.channelId,
        outcome: simpleEthAllocation([newChannel.channelId, 10]),
        signingAddress: ledgerChannel.participantA.signingAddress,
      };
      expect(payload).toMatchObject({
        requests: [serializeRequest(expectedProposeLedgerUpdate)],
      });
    });

    it('makes no proposal but identifies channel when ledger has insufficient funds', async () => {
      // create an application channel that allocates 200 coins
      const appChannel = TestChannel.create({aBal: 100, bBal: 100});
      await appChannel.insertInto(store, {states: [0, 1]});
      // create a ledger channel whose current state doesn't fund that channel. Note distinct channel nonce should be automatically ensured automatically
      const ledgerChannel = TestLedgerChannel.create({});
      await ledgerChannel.insertInto(store, {
        // Will be "fully funded" with 10 coins, but this is insufficient for the app channel
        states: [4, 5],
        bals: [
          [appChannel.participantA.destination, 5],
          [appChannel.participantB.destination, 5],
        ],
      });
      // create a ledger request for the ledger to fund the channel
      await ledgerChannel.insertFundingRequest(store, appChannel.channelId);

      // crank the ledger manager
      const response = new WalletResponse();
      await ledgerManager.crank(ledgerChannel.channelId, response);

      // assert that there is NO proposal in the outbox
      expect(response.multipleChannelOutput().outbox).toHaveLength(0);
    });

    it('proposes outcome funding some channels, identifying insufficient funds for others', async () => {
      // create and insert a funded ledger channel that doesn't fund any channels yet. Note distinct channel nonce should be automatically ensured automatically
      const ledgerChannel = TestLedgerChannel.create({});
      await ledgerChannel.insertInto(store, {
        states: [4, 5],
        bals: [10, 10],
      });

      // create 5 application channels, each allocating 5 to Alice
      // The ledger channel can only afford 2 of these
      const appChannels = [0, 1, 2, 3, 4].map(() => TestChannel.create({aBal: 5, bBal: 0}));
      for await (const appChannel of appChannels) {
        // for each one, insert the channel and a ledger funding request
        await appChannel.insertInto(store, {states: [0, 1]});
        await ledgerChannel.insertFundingRequest(store, appChannel.channelId);
      }

      // crank the ledger manager
      const response = new WalletResponse();
      await ledgerManager.crank(ledgerChannel.channelId, response);

      // assert that there is a proposal some of those channels in the outbox
      const payload = getPayloadFor(
        ledgerChannel.participantB.participantId,
        response.multipleChannelOutput().outbox
      );
      const expectedProposeLedgerUpdate: ProposeLedgerUpdate = {
        type: 'ProposeLedgerUpdate',
        nonce: 1,
        channelId: ledgerChannel.channelId,
        outcome: simpleEthAllocation(
          [bob, 10],
          ...appChannels.slice(0, 2).map(c => [c.channelId, c.startBal] as [string, number])
        ),
        signingAddress: ledgerChannel.participantA.signingAddress,
      };

      expect(payload).toMatchObject({
        requests: [serializeRequest(expectedProposeLedgerUpdate)],
      });
    });
  });

  describe('as responding proposer', () => {
    it('will propose identical proposal to counterparty with same requests', () => {
      const requestChannel = prefundChannelWithAllocations([alice, 1]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        theirLedgerProposal: {
          proposal: simpleEthAllocation([alice, 9], [bob, 10], [requestChannel.channelId, 1]),
          nonce: 0,
        },
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerUpdate',
        nonce: protocolArgs.theirLedgerProposal.nonce + 1,
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: protocolArgs.theirLedgerProposal.proposal,
      });
    });
  });
});

describe('exchanging signed ledger state updates', () => {
  describe('as initial signer', () => {
    it('does not sign ledger update if one has already been signed by me', () => {
      const requestChannel = prefundChannelWithAllocations([alice, 1]);
      const proposal = simpleEthAllocation([alice, 9], [bob, 10], [requestChannel.channelId, 1]);
      const fundingChannel = channel({
        appDefinition: '0x0000000000000000000000000000000000000000',
        vars: [
          stateSignedBy([aliceSW()])({
            appData: '0x00',
            turnNum: 4,
            outcome: proposal,
          }),
          defaultLedgerChannel.latest,
        ],
      }).protocolState as ChannelStateWithSupported;
      const protocolArgs = {
        fundingChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        myLedgerProposal: {proposal, nonce: 0},
        theirLedgerProposal: {proposal, nonce: 0},
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toBeUndefined();
    });

    it('generates signed ledger update when proposals were identical', () => {
      const requestChannel = prefundChannelWithAllocations([alice, 1]);
      const proposal = simpleEthAllocation([alice, 9], [bob, 10], [requestChannel.channelId, 1]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        myLedgerProposal: {proposal, nonce: 0},
        theirLedgerProposal: {proposal, nonce: 0},
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'SignLedgerUpdate',
        channelId: protocolArgs.fundingChannel.channelId,
        stateToSign: {
          outcome: proposal,
          turnNum: 4,
        },
      });
    });

    it('generates signed ledger update when proposals were not identical but overlapped', () => {
      const requestChannel1 = prefundChannelWithAllocations([alice, 1]);
      const requestChannel2 = prefundChannelWithAllocations([alice, 1]);
      const requestChannel3 = prefundChannelWithAllocations([alice, 1]);
      const proposal1 = simpleEthAllocation(
        [alice, 8],
        [bob, 10],
        [requestChannel1.channelId, 1],
        [requestChannel2.channelId, 1]
      );
      const proposal2 = simpleEthAllocation(
        [alice, 8],
        [bob, 10],
        [requestChannel2.channelId, 1],
        [requestChannel3.channelId, 1]
      );
      const expectedMerged = simpleEthAllocation(
        [alice, 9],
        [bob, 10],
        [requestChannel2.channelId, 1]
      );
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [
          requestChannel1.protocolState,
          requestChannel2.protocolState,
          requestChannel3.protocolState,
        ],
        myLedgerProposal: {proposal: proposal1, nonce: 0},
        theirLedgerProposal: {proposal: proposal2, nonce: 0},
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'SignLedgerUpdate',
        channelId: protocolArgs.fundingChannel.channelId,
        stateToSign: {
          outcome: expectedMerged,
          turnNum: 4,
        },
      });
    });

    it('dismisses proposals when the intersected result is identical to supported', () => {
      const requestChannel1 = prefundChannelWithAllocations([alice, 1]);
      const requestChannel2 = prefundChannelWithAllocations([alice, 1]);
      const proposal1 = simpleEthAllocation([alice, 9], [bob, 10], [requestChannel1.channelId, 1]);
      const proposal2 = simpleEthAllocation([alice, 9], [bob, 10], [requestChannel2.channelId, 1]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel1.protocolState, requestChannel2.protocolState],
        myLedgerProposal: {proposal: proposal1, nonce: 0},
        theirLedgerProposal: {proposal: proposal2, nonce: 0},
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'DismissLedgerProposals',
        channelId: protocolArgs.fundingChannel.channelId,
      });
    });
  });

  describe('as responding signer', () => {
    it('throws an error if counterparty signed update does not follow protocol', () => {
      const requestChannel = prefundChannelWithAllocations([alice, 1]);
      const proposal = simpleEthAllocation([alice, 9], [bob, 10], [requestChannel.channelId, 1]);
      const unexpectedOutcome = simpleEthAllocation([bob, 1337]);
      const fundingChannel = channel({
        vars: [
          stateSignedBy([bobSW()])({
            turnNum: 4,
            outcome: unexpectedOutcome,
          }),
          defaultLedgerChannel.latest,
        ],
      }).protocolState as ChannelStateWithSupported;
      const protocolArgs = {
        fundingChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        myLedgerProposal: {proposal, nonce: 0},
        theirLedgerProposal: {proposal, nonce: 0},
      };
      expect(() => protocol(processLedgerQueueProtocolState(protocolArgs))).toThrow(
        'received a signed reveal that is _not_ what we agreed on :/'
      );
    });
  });
});
