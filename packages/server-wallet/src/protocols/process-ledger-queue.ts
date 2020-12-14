/**
 * Follows an algorithm to guarantee that an agreed upon ledger update will be signed by
 * 2 participants in at most 2 round trips. Either can propose a state at any time and either
 * can counterpropose a state at any time. However, if they follow the algorithm below they
 * should always be able to compute the expected outcome by the second round trip.
 *
 * Algorithm:
 *
 * IF there are any pending ledger updates (to fund OR defund a channel)
 *
 *   i. Check if I already proposed a new ledger update O₁. Otherwise, iteratively allocate funds
 *      from the supported state's (i.e., S) outcome to each request, call this O₁.
 *
 *  ii. Check if there is an existing proposal for a ledger update, O₂.
 *
 * iii. If so, compute O₁ ⋂ O₂
 *
 *      a. If I haven't sent my proposal yet, propose O₁ (or O₁ ⋂ O₂ if O₂ exists)
 *
 *      b. If I have sent my proposal and received theirs, sign O₁ ⋂ O₂ at
 *         the turn number n higher than the most recently supported one.
 *
 *      c. If O₂ is NULL (not received a proposal), wait for the counterparty.
 *
 */

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
  AllocationItem,
  Errors,
} from '@statechannels/wallet-core';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';
import {LedgerRequestType} from '../models/ledger-request';

import {Protocol, ProtocolResult, ChannelState} from './state';
import {
  DismissLedgerProposals,
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
  counterpartyLedgerCommitNonce: number;
  myProposedLedgerCommitNonce: number;
  channelsRequestingFunds: ChannelState[];
  channelsReturningFunds: ChannelState[];
};

function removeChannelFromAllocation(
  allocationItems: AllocationItem[],
  channel: ChannelState
): AllocationItem[] {
  if (!channel.supported) throw new Error('state is unsupported');

  const {allocationItems: channelAllocations} = checkThat(
    channel.supported.outcome,
    isSimpleAllocation
  );

  const [removed, remaining] = _.partition(allocationItems, ['destination', channel.channelId]);

  if (removed.length !== 1) throw new Error('Expected to find exactly one item');

  if (removed[0].amount !== channelAllocations.map(x => x.amount).reduce(BN.add, BN.from(0)))
    throw new Error('Expected outcome allocations to add up to the allocation in ledger');

  return channelAllocations.reduce((remainingItems, {destination, amount}) => {
    const idx = remainingItems.findIndex(to => destination === to.destination);
    return idx > -1
      ? _.update(remainingItems, idx, to => ({
          amount: BN.add(amount, to.amount),
          destination,
        }))
      : [...remainingItems, {amount, destination}];
  }, remaining);
}

const retrieveFundsFromClosedChannels = (
  {assetHolderAddress, allocationItems}: SimpleAllocation,
  channelsReturningFunds: ChannelState[]
): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: assetHolderAddress,
  allocationItems: channelsReturningFunds.reduce(removeChannelFromAllocation, allocationItems),
});

const allocateFundsToChannels = (
  original: SimpleAllocation,
  allocationTargets: ChannelState[]
): {
  outcome: SimpleAllocation;
  insufficientFunds: Bytes32[];
} => {
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
        e.message.toString() === Errors.InsufficientFunds ||
        // There is no participant balance at all (exactly 0 left)
        e.message.toString() === Errors.DestinationMissing
      )
        insufficientFunds.push(channelId);
      return outcome;
    }
  }, original);

  return {outcome, insufficientFunds};
};

const intersectOutcome = (a: SimpleAllocation, b: SimpleAllocation): SimpleAllocation => {
  if (a.assetHolderAddress !== b.assetHolderAddress)
    throw new Error('intersectOutcome: assetHolderAddresses not equal');
  return {
    type: 'SimpleAllocation',
    assetHolderAddress: b.assetHolderAddress,
    allocationItems: _.intersectionWith(
      a.allocationItems,
      b.allocationItems,
      areAllocationItemsEqual
    ),
  };
};
const redistributeFunds = (
  outcome: SimpleAllocation,
  defunding: ChannelState[],
  funding: ChannelState[]
): {
  outcome: SimpleAllocation;
  insufficientFunds: Bytes32[];
} => allocateFundsToChannels(retrieveFundsFromClosedChannels(outcome, defunding), funding);

const xorOutcome = (a: SimpleAllocation, b: SimpleAllocation): SimpleAllocation => {
  if (a.assetHolderAddress !== b.assetHolderAddress)
    throw new Error('xorOutcome: assetHolderAddresses not equal');
  return {
    type: 'SimpleAllocation',
    assetHolderAddress: b.assetHolderAddress,
    allocationItems: _.xorWith(a.allocationItems, b.allocationItems, areAllocationItemsEqual),
  };
};

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
}: ProtocolState): DismissLedgerProposals | SignLedgerState | ProposeLedgerState | false => {
  // Sanity-checks
  if (!supported) return false;
  if (!latestSignedByMe) return false;
  if (supported.turnNum < n) return false;
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

  if (_.isEqual(outcome, supportedOutcome))
    return {
      type: 'DismissLedgerProposals',
      channelId,
      channelsNotFunded: insufficientFunds,
    };

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

  let outcome: Outcome | undefined;
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

  if (_.isEqual(outcome, supportedOutcome)) outcome = undefined; // Don't propose the current state

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

    myProposedLedgerCommit: mine.outcome ? checkThat(mine.outcome, isSimpleAllocation) : undefined,
    counterpartyLedgerCommit: theirs.outcome
      ? checkThat(theirs.outcome, isSimpleAllocation)
      : undefined,

    myProposedLedgerCommitNonce: mine.nonce,
    counterpartyLedgerCommitNonce: theirs.nonce,

    channelsRequestingFunds: await Promise.all<ChannelState>(
      compose(
        map(({channelToBeFunded}: LedgerRequestType) => store.getChannel(channelToBeFunded, tx)),
        filter(['status', 'pending']),
        filter(['type', 'fund'])
      )(ledgerRequests)
    ).then(sortByNonce),

    channelsReturningFunds: await Promise.all<ChannelState>(
      compose(
        map(({channelToBeFunded}: LedgerRequestType) => store.getChannel(channelToBeFunded, tx)),
        filter(['status', 'pending']),
        filter(['type', 'defund'])
      )(ledgerRequests)
    ).then(sortByNonce),
  };
};

const sortByNonce = (channelStates: ChannelState[]): ChannelState[] =>
  _.sortBy(channelStates, ({latest: {channelNonce}}) => channelNonce);
