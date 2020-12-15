import _ from 'lodash';
import {AllocationItem, BN, makeDestination, simpleEthAllocation} from '@statechannels/wallet-core';

import {channel} from '../../models/__test__/fixtures/channel';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {alice as aliceSW, bob as bobSW} from '../../wallet/__test__/fixtures/signing-wallets';
import {stateSignedBy} from '../../wallet/__test__/fixtures/states';
import {protocol, ProtocolState} from '../process-ledger-queue';

let i = 0;
const prefundChannelWithAllocations = (allocations: AllocationItem[] = []) =>
  channel({
    channelNonce: i++, // Unique channel id each time this fixture is used
    fundingStrategy: 'Ledger',
    vars: [
      stateSignedBy([aliceSW(), bobSW()])({
        turnNum: 1,
        outcome: simpleEthAllocation(allocations),
      }),
    ],
  });

const ledgerChannelWithAllocations = (allocations: AllocationItem[]) =>
  channel({
    vars: [
      stateSignedBy([aliceSW(), bobSW()])({turnNum: 3, outcome: simpleEthAllocation(allocations)}),
    ],
  }).protocolState;

const defaultLedgerChannel = ledgerChannelWithAllocations([
  {
    destination: alice().destination,
    amount: BN.from(10),
  },
  {
    destination: bob().destination,
    amount: BN.from(10),
  },
]);

// const unfundedLedgerChannel = ledgerChannelWithAllocations([]);

const processLedgerQueueProtocolState = (args: Partial<ProtocolState> = {}) => ({
  fundingChannel: defaultLedgerChannel,

  channelsRequestingFunds: [],
  channelsReturningFunds: [],

  counterpartyLedgerCommit: undefined,
  counterpartyLedgerCommitNonce: 0,

  myProposedLedgerCommit: undefined,
  myProposedLedgerCommitNonce: 0,

  ...args,
});

describe('marking ledger requests as complete', () => {
  it('takes no action if there are no ledger requests', () => {
    expect(protocol(processLedgerQueueProtocolState())).toBeUndefined();
  });

  it('detects completed funding requests from the outcome of supported state', () => {
    const requestChannel = channel();
    const protocolArgs = {
      fundingChannel: ledgerChannelWithAllocations([
        {
          destination: makeDestination(requestChannel.channelId),
          amount: BN.from(10),
        },
      ]),
      channelsRequestingFunds: [requestChannel.protocolState],
    };
    expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
      type: 'MarkLedgerFundingRequestsAsComplete',
      fundedChannels: [requestChannel.channelId],
      defundedChannels: [],
      ledgerChannelId: protocolArgs.fundingChannel.channelId,
    });
  });

  it('detects completed defunding requests from the outcome of supported state', () => {
    const requestChannel = channel();
    const protocolArgs = {
      fundingChannel: defaultLedgerChannel,
      channelsReturningFunds: [requestChannel.protocolState],
    };
    expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
      type: 'MarkLedgerFundingRequestsAsComplete',
      fundedChannels: [],
      defundedChannels: [requestChannel.channelId],
      ledgerChannelId: protocolArgs.fundingChannel.channelId,
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
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        myProposedLedgerCommit: simpleEthAllocation([
          {destination: alice().destination, amount: BN.from(9)},
          {destination: bob().destination, amount: BN.from(10)},
          {destination: makeDestination(requestChannel.channelId), amount: BN.from(1)},
        ]),
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toBeUndefined();
    });

    it('proposes new outcome funding 1 channel', () => {
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: simpleEthAllocation([
          {destination: alice().destination, amount: BN.from(9)},
          {destination: bob().destination, amount: BN.from(10)},
          {destination: makeDestination(requestChannel.channelId), amount: BN.from(1)},
        ]),
      });
    });

    it('proposes new outcome funding many channels', () => {
      const requestChannels = _.range(5).map(() =>
        prefundChannelWithAllocations([{destination: alice().destination, amount: BN.from(1)}])
      );
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: _.map(requestChannels, 'protocolState'),
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: simpleEthAllocation([
          {destination: alice().destination, amount: BN.from(5)},
          {destination: bob().destination, amount: BN.from(10)},
          ..._.map(requestChannels, requestChannel => ({
            destination: makeDestination(requestChannel.channelId),
            amount: BN.from(1),
          })),
        ]),
      });
    });

    it('proposes new outcome exhausting 100% of funds', () => {
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(10)},
        {destination: bob().destination, amount: BN.from(10)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: simpleEthAllocation([
          {destination: makeDestination(requestChannel.channelId), amount: BN.from(20)},
        ]),
      });
    });

    it('proposes new outcome requiring defund before having sufficient funds', () => {
      const olderChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(10)},
      ]);
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(10)},
      ]);
      const protocolArgs = {
        fundingChannel: ledgerChannelWithAllocations([
          {destination: makeDestination(olderChannel.channelId), amount: BN.from(10)},
        ]),
        channelsRequestingFunds: [requestChannel.protocolState],
        channelsReturningFunds: [olderChannel.protocolState],
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: simpleEthAllocation([
          {destination: makeDestination(requestChannel.channelId), amount: BN.from(10)},
        ]),
      });
    });

    it('makes no proposal but identifies channel when ledger has insufficient funds', () => {
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(100)},
        {destination: bob().destination, amount: BN.from(100)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: undefined,
        channelsNotFunded: [requestChannel.channelId],
      });
    });

    it('proposes outcome funding some channels, identifying insufficient funds for others', () => {
      const requestChannels = _.range(5).map(() =>
        prefundChannelWithAllocations([{destination: alice().destination, amount: BN.from(5)}])
      );
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: _.map(requestChannels, 'protocolState'),
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: simpleEthAllocation([
          {destination: bob().destination, amount: BN.from(10)},
          {
            destination: makeDestination(requestChannels[0].channelId),
            amount: BN.from(5),
          },
          {
            destination: makeDestination(requestChannels[1].channelId),
            amount: BN.from(5),
          },
        ]),
        channelsNotFunded: [
          requestChannels[2].channelId,
          requestChannels[3].channelId,
          requestChannels[4].channelId,
        ],
      });
    });
  });

  describe('as responding proposer', () => {
    it('will propose identical proposal to counterparty with same requests', () => {
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        counterpartyLedgerCommit: simpleEthAllocation([
          {destination: alice().destination, amount: BN.from(9)},
          {destination: bob().destination, amount: BN.from(10)},
          {destination: makeDestination(requestChannel.channelId), amount: BN.from(1)},
        ]),
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: protocolArgs.counterpartyLedgerCommit,
      });
    });

    it('will propose intersected proposal to counterparty with superset of requests', () => {
      const requestChannel1 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const requestChannel2 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel1.protocolState, requestChannel2.protocolState],
        counterpartyLedgerCommit: simpleEthAllocation([
          {destination: alice().destination, amount: BN.from(9)},
          {destination: bob().destination, amount: BN.from(10)},
          {destination: makeDestination(requestChannel1.channelId), amount: BN.from(1)},
        ]),
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'ProposeLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        outcome: simpleEthAllocation([
          {destination: alice().destination, amount: BN.from(9)},
          {destination: bob().destination, amount: BN.from(10)},
          {destination: makeDestination(requestChannel1.channelId), amount: BN.from(1)},
        ]),
      });
    });

    it('will not propose new state if intersection is identical to supported outcome', () => {
      const requestChannel1 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const requestChannel2 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel2.protocolState], // <-- requestChannel1 missing
        counterpartyLedgerCommit: simpleEthAllocation([
          {destination: alice().destination, amount: BN.from(9)},
          {destination: bob().destination, amount: BN.from(10)},
          {destination: makeDestination(requestChannel1.channelId), amount: BN.from(1)},
        ]),
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toBeUndefined();
    });
  });
});

describe('exchanging signed ledger state updates', () => {
  describe('as initial signer', () => {
    it('does not sign ledger update if one has already been signed by me', () => {
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const proposal = simpleEthAllocation([
        {destination: alice().destination, amount: BN.from(9)},
        {destination: bob().destination, amount: BN.from(10)},
        {destination: makeDestination(requestChannel.channelId), amount: BN.from(1)},
      ]);
      const {protocolState: fundingChannel} = channel({
        vars: [
          stateSignedBy([aliceSW()])({
            turnNum: 5,
            outcome: proposal,
          }),
          defaultLedgerChannel.latest,
        ],
      });
      const protocolArgs = {
        fundingChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        myProposedLedgerCommit: proposal,
        counterpartyLedgerCommit: proposal,
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toBeUndefined();
    });

    it('generates signed ledger update when proposals were identical', () => {
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const proposal = simpleEthAllocation([
        {destination: alice().destination, amount: BN.from(9)},
        {destination: bob().destination, amount: BN.from(10)},
        {destination: makeDestination(requestChannel.channelId), amount: BN.from(1)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        myProposedLedgerCommit: proposal,
        counterpartyLedgerCommit: proposal,
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'SignLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        stateToSign: {
          outcome: proposal,
          turnNum: 5,
        },
      });
    });

    it('generates signed ledger update when proposals were not identical but overlapped', () => {
      const requestChannel1 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const requestChannel2 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const requestChannel3 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const proposal1 = simpleEthAllocation([
        {destination: alice().destination, amount: BN.from(8)},
        {destination: bob().destination, amount: BN.from(10)},
        {destination: makeDestination(requestChannel1.channelId), amount: BN.from(1)},
        {destination: makeDestination(requestChannel2.channelId), amount: BN.from(1)},
      ]);
      const proposal2 = simpleEthAllocation([
        {destination: alice().destination, amount: BN.from(8)},
        {destination: bob().destination, amount: BN.from(10)},
        {destination: makeDestination(requestChannel2.channelId), amount: BN.from(1)},
        {destination: makeDestination(requestChannel3.channelId), amount: BN.from(1)},
      ]);
      const expectedMerged = simpleEthAllocation([
        {destination: alice().destination, amount: BN.from(9)},
        {destination: bob().destination, amount: BN.from(10)},
        {destination: makeDestination(requestChannel2.channelId), amount: BN.from(1)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [
          requestChannel1.protocolState,
          requestChannel2.protocolState,
          requestChannel3.protocolState,
        ],
        myProposedLedgerCommit: proposal1,
        counterpartyLedgerCommit: proposal2,
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'SignLedgerState',
        channelId: protocolArgs.fundingChannel.channelId,
        stateToSign: {
          outcome: expectedMerged,
          turnNum: 5,
        },
      });
    });

    it('dismisses proposals when the intersected result is identical to supported', () => {
      const requestChannel1 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const requestChannel2 = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const proposal1 = simpleEthAllocation([
        {destination: alice().destination, amount: BN.from(9)},
        {destination: bob().destination, amount: BN.from(10)},
        {destination: makeDestination(requestChannel1.channelId), amount: BN.from(1)},
      ]);
      const proposal2 = simpleEthAllocation([
        {destination: alice().destination, amount: BN.from(9)},
        {destination: bob().destination, amount: BN.from(10)},
        {destination: makeDestination(requestChannel2.channelId), amount: BN.from(1)},
      ]);
      const protocolArgs = {
        fundingChannel: defaultLedgerChannel,
        channelsRequestingFunds: [requestChannel1.protocolState, requestChannel2.protocolState],
        myProposedLedgerCommit: proposal1,
        counterpartyLedgerCommit: proposal2,
      };
      expect(protocol(processLedgerQueueProtocolState(protocolArgs))).toMatchObject({
        type: 'DismissLedgerProposals',
        channelId: protocolArgs.fundingChannel.channelId,
      });
    });
  });

  describe('as responding signer', () => {
    it('throws an error if counterparty signed update does not follow protocol', () => {
      const requestChannel = prefundChannelWithAllocations([
        {destination: alice().destination, amount: BN.from(1)},
      ]);
      const proposal = simpleEthAllocation([
        {destination: alice().destination, amount: BN.from(9)},
        {destination: bob().destination, amount: BN.from(10)},
        {destination: makeDestination(requestChannel.channelId), amount: BN.from(1)},
      ]);
      const unexpectedOutcome = simpleEthAllocation([
        {destination: bob().destination, amount: BN.from(1337)},
      ]);
      const {protocolState: fundingChannel} = channel({
        vars: [
          stateSignedBy([bobSW()])({
            turnNum: 5,
            outcome: unexpectedOutcome,
          }),
          defaultLedgerChannel.latest,
        ],
      });
      const protocolArgs = {
        fundingChannel,
        channelsRequestingFunds: [requestChannel.protocolState],
        myProposedLedgerCommit: proposal,
        counterpartyLedgerCommit: proposal,
      };
      expect(() => protocol(processLedgerQueueProtocolState(protocolArgs))).toThrow(
        'received a signed reveal that is _not_ what we agreed on :/'
      );
    });
  });
});
