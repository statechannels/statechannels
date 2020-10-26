import {compose, map, filter} from 'lodash/fp';
import _ from 'lodash';
import {
  allocateToTarget,
  checkThat,
  isSimpleAllocation,
  Outcome,
  SimpleAllocation,
  areAllocationItemsEqual,
  BN,
} from '@statechannels/wallet-core';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';
import {LedgerRequestType} from '../models/ledger-request';

import {Protocol, ProtocolResult, ChannelState} from './state';
import {
  MarkLedgerFundingRequestsAsComplete,
  noAction,
  ProposeLedgerState,
  ProtocolAction,
  SignLedgerState,
} from './actions';

export type ProtocolState = {
  fundingChannel: ChannelState;
  counterpartyLedgerCommit?: SimpleAllocation;
  myProposedLedgerCommit?: SimpleAllocation;
  channelsRequestingFunds: ChannelState[];
  channelsReturningFunds: ChannelState[];
};

const retrieveFundsFromClosedChannels = (
  original: SimpleAllocation,
  channelsReturningFunds: ChannelState[]
): SimpleAllocation => ({
  ...original,
  allocationItems: channelsReturningFunds.reduce(
    (allocationItems, channel) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (channel.supported!.outcome as SimpleAllocation).allocationItems
        .reduce((allocationItems, {destination, amount}) => {
          const idx = allocationItems.findIndex(to => destination === to.destination);
          return idx > -1
            ? _.update(allocationItems, idx, to => ({
                destination,
                amount: BN.add(amount, to.amount),
              }))
            : [...allocationItems, {destination, amount}];
        }, allocationItems)
        .filter(item => item.destination !== channel.channelId),
    original.allocationItems
  ),
});

const allocateFundsToChannels = (
  original: SimpleAllocation,
  allocationTargets: ChannelState[]
): {
  outcome: SimpleAllocation;
  insufficientFunds: Bytes32[];
} => {
  // This could fail at some point if there is no longer space to fund stuff
  // TODO: Handle that case
  const insufficientFunds: Bytes32[] = [];
  const outcome = allocationTargets.reduce((outcome, {channelId, supported}) => {
    try {
      return allocateToTarget(
        outcome,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (supported!.outcome as SimpleAllocation).allocationItems,
        channelId
      ) as SimpleAllocation;
    } catch (e) {
      if (
        // A proposed channel wants more funds than are available from a participant
        e.message.toString() === 'Insufficient funds in fundingChannel channel' ||
        // There is no participant balance at all (exactly 0 left)
        e.message.toString() === 'Destination missing from ledger channel'
      )
        insufficientFunds.push(channelId);
      return outcome;
    }
  }, original);

  return {outcome, insufficientFunds};
};

const redistributeFunds = (
  outcome: SimpleAllocation,
  defunding: ChannelState[],
  funding: ChannelState[]
): {
  outcome: SimpleAllocation;
  insufficientFunds: Bytes32[];
} => allocateFundsToChannels(retrieveFundsFromClosedChannels(outcome, defunding), funding);

const intersectOutcome = (a: SimpleAllocation, b: SimpleAllocation): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: b.assetHolderAddress,
  allocationItems: _.intersectionWith(
    a.allocationItems,
    b.allocationItems,
    areAllocationItemsEqual
  ),
});

const xorOutcome = (a: SimpleAllocation, b: SimpleAllocation): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: b.assetHolderAddress,
  allocationItems: _.xorWith(a.allocationItems, b.allocationItems, areAllocationItemsEqual),
});

const mergeProposedLedgerUpdates = (
  mine: SimpleAllocation,
  theirs: SimpleAllocation,
  supportedOutcome: SimpleAllocation,
  channelsRequestingFunds: ChannelState[],
  channelsReturningFunds: ChannelState[]
) => {
  const merged = intersectOutcome(mine, theirs);
  const xor = xorOutcome(mine, theirs);

  const bothFunding = channelsRequestingFunds.filter(({channelId}) =>
    _.some(merged.allocationItems, ['destination', channelId])
  );

  const bothDefunding = channelsReturningFunds.filter(
    ({channelId}) => !_.some(xor.allocationItems, ['destination', channelId])
  );

  return redistributeFunds(supportedOutcome, bothDefunding, bothFunding);
};

const exchangeReveals = ({
  fundingChannel: {
    supported,
    latestSignedByMe,
    latest,
    channelId,
    participants: {length: n},
  },
  myProposedLedgerCommit,
  counterpartyLedgerCommit,
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolState): SignLedgerState | false => {
  // Sanity-checks
  if (!supported) return false;
  if (!latestSignedByMe) return false;
  if (!myProposedLedgerCommit) return false;
  if (!counterpartyLedgerCommit) return false;

  // Already signed something and waiting for reply
  if (latestSignedByMe.turnNum === supported.turnNum + n) return false;

  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  const receivedReveal = latest.turnNum === supported.turnNum + n;

  let outcome: Outcome = myProposedLedgerCommit;
  let insufficientFunds: Bytes32[] = [];

  if (!_.isEqual(counterpartyLedgerCommit, myProposedLedgerCommit))
    ({outcome, insufficientFunds} = mergeProposedLedgerUpdates(
      myProposedLedgerCommit,
      counterpartyLedgerCommit,
      supportedOutcome,
      channelsRequestingFunds,
      channelsReturningFunds
    ));

  if (receivedReveal && !_.isEqual(outcome, latest.outcome))
    // TODO: signals a corrupt / broken counterparty wallet, what do we want to do here?
    throw new Error('received a signed reveal that is _not_ what we agreed on :/');

  return {
    type: 'SignLedgerState',
    channelId,
    stateToSign: {
      ...supported,
      outcome,
      turnNum: supported.turnNum + n,
    },
    channelsNotFunded: insufficientFunds,
  };
};

const exchangeCommits = ({
  fundingChannel: {supported, latestSignedByMe, channelId},
  myProposedLedgerCommit,
  counterpartyLedgerCommit,
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolState): ProposeLedgerState | false => {
  // Sanity-checks
  if (!supported) return false;
  if (!latestSignedByMe) return false;

  // Already signed something and waiting for reply (may have deleted commits already)
  if (latestSignedByMe.turnNum > supported.turnNum) return false;

  // Move to reveal phase
  if (myProposedLedgerCommit && counterpartyLedgerCommit) return false;

  // Don't propose another commit, wait for theirs
  if (myProposedLedgerCommit) return false;

  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  let outcome: Outcome;
  let insufficientFunds: Bytes32[] = [];

  ({outcome, insufficientFunds} = redistributeFunds(
    supportedOutcome,
    channelsReturningFunds,
    channelsRequestingFunds
  ));

  if (counterpartyLedgerCommit && !_.isEqual(counterpartyLedgerCommit, outcome)) {
    const mergedLedgerUpdate = mergeProposedLedgerUpdates(
      outcome,
      counterpartyLedgerCommit,
      supportedOutcome,
      channelsRequestingFunds,
      channelsReturningFunds
    );

    outcome = mergedLedgerUpdate.outcome;
    insufficientFunds = insufficientFunds.concat(mergedLedgerUpdate.insufficientFunds);
  }

  return {
    type: 'ProposeLedgerState',
    channelId,
    outcome,
    channelsNotFunded: insufficientFunds,
  };
};

const markRequestsAsComplete = ({
  fundingChannel: {supported, channelId},
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolState): MarkLedgerFundingRequestsAsComplete | false => {
  if (!supported) return false;
  if (channelsRequestingFunds.length === 0 && channelsReturningFunds.length === 0) return false;

  const fundedChannels = channelsRequestingFunds.filter(({channelId}) =>
    _.some(
      checkThat(supported.outcome, isSimpleAllocation).allocationItems,
      allocationItem => allocationItem.destination === channelId
    )
  );

  const defundedChannels = channelsReturningFunds.filter(
    ({channelId}) =>
      !_.some(
        checkThat(supported.outcome, isSimpleAllocation).allocationItems,
        allocationItem => allocationItem.destination === channelId
      )
  );

  if (fundedChannels.length === 0 && defundedChannels.length === 0) return false;

  return {
    type: 'MarkLedgerFundingRequestsAsComplete',
    fundedChannels: fundedChannels.map(channel => channel.channelId),
    defundedChannels: defundedChannels.map(channel => channel.channelId),
    ledgerChannelId: channelId,
  };
};

export const protocol: Protocol<ProtocolState> = (
  ps: ProtocolState
): ProtocolResult<ProtocolAction> =>
  markRequestsAsComplete(ps) ||
  ((ps.channelsRequestingFunds.length > 0 || ps.channelsReturningFunds.length) > 0 &&
    (exchangeCommits(ps) || exchangeReveals(ps))) ||
  noAction;

/**
 * Helper method to retrieve scoped data needed for ProcessLedger protocol.
 */
export const getProcessLedgerQueueProtocolState = async (
  store: Store,
  ledgerChannelId: Bytes32,
  tx: Transaction
): Promise<ProtocolState> => {
  const ledgerRequests = await store.getPendingLedgerRequests(ledgerChannelId, tx);
  const {mine, theirs} = await store.getLedgerProposals(ledgerChannelId, tx);
  return {
    fundingChannel: await store.getChannel(ledgerChannelId, tx),
    myProposedLedgerCommit: mine && checkThat(mine, isSimpleAllocation),
    counterpartyLedgerCommit: theirs && checkThat(theirs, isSimpleAllocation),
    channelsRequestingFunds: (
      await Promise.all<ChannelState>(
        compose(
          map(({channelToBeFunded}: LedgerRequestType) => store.getChannel(channelToBeFunded, tx)),
          filter(['status', 'pending']),
          filter(['type', 'fund'])
        )(ledgerRequests)
      )
    ).sort((a, b) => a.latest.channelNonce - b.latest.channelNonce),
    channelsReturningFunds: (
      await Promise.all<ChannelState>(
        compose(
          map(({channelToBeFunded}: LedgerRequestType) => store.getChannel(channelToBeFunded, tx)),
          filter(['status', 'pending']),
          filter(['type', 'defund'])
        )(ledgerRequests)
      )
    ).sort((a, b) => a.latest.channelNonce - b.latest.channelNonce),
  };
};
