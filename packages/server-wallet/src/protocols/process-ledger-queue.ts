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

import {Protocol, ProtocolResult, ChannelState, ChannelStateWithSupported} from './state';
import {
  DismissLedgerProposals,
  MarkLedgerFundingRequestsAsComplete,
  noAction,
  ProposeLedgerState,
  ProtocolAction,
  SignLedgerState,
} from './actions';

export type ProtocolState = {
  fundingChannel: ChannelStateWithSupported;
  theirLedgerProposal?: SimpleAllocation;
  myLedgerProposal?: SimpleAllocation;
  theirLedgerProposalNonce: number;
  myLedgerProposalNonce: number;
  channelsRequestingFunds: ChannelState[];
  channelsReturningFunds: ChannelState[];
};

type ProtocolStateWithCommits = ProtocolState & {
  theirLedgerProposal: SimpleAllocation;
  myLedgerProposal: SimpleAllocation;
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
  channelsNotFunded: Bytes32[];
} => {
  const channelsNotFunded: Bytes32[] = [];
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
        channelsNotFunded.push(channelId);
      return outcome;
    }
  }, original);

  return {outcome, channelsNotFunded};
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
  channelsNotFunded: Bytes32[];
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

const channelIdMatchesDestination = ({channelId}: ChannelState, {destination}: AllocationItem) =>
  channelId === destination;

const mergeProposedLedgerUpdates = (
  mine: SimpleAllocation,
  theirs: SimpleAllocation,
  supportedOutcome: SimpleAllocation,
  requesting: ChannelState[],
  returning: ChannelState[]
) => {
  const {allocationItems: merged} = intersectOutcome(mine, theirs);
  const {allocationItems: xor} = xorOutcome(mine, theirs);
  const bothFunding = _.intersectionWith(requesting, merged, channelIdMatchesDestination);
  const bothDefunding = _.differenceWith(returning, xor, channelIdMatchesDestination);
  return redistributeFunds(supportedOutcome, bothDefunding, bothFunding);
};

const exchangeSignedLedgerStates = ({
  fundingChannel: {
    supported,
    latestSignedByMe,
    latest,
    channelId,
    participants: {length: n},
  },
  myLedgerProposal,
  theirLedgerProposal,
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolStateWithCommits): DismissLedgerProposals | SignLedgerState | false => {
  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  // Already signed something and waiting for reply
  if (latestSignedByMe.turnNum === supported.turnNum + n) return false;

  const {outcome, channelsNotFunded} = _.isEqual(theirLedgerProposal, myLedgerProposal)
    ? {outcome: myLedgerProposal, channelsNotFunded: []}
    : mergeProposedLedgerUpdates(
        myLedgerProposal,
        theirLedgerProposal,
        supportedOutcome,
        channelsRequestingFunds,
        channelsReturningFunds
      );

  const receivedReveal = latest.turnNum === supported.turnNum + n;
  if (receivedReveal && !_.isEqual(outcome, latest.outcome))
    // TODO: signals a corrupt / broken counterparty wallet, what do we want to do here?
    throw new Error('received a signed reveal that is _not_ what we agreed on :/');

  return _.isEqual(outcome, supportedOutcome)
    ? {
        type: 'DismissLedgerProposals',
        channelId,
        channelsNotFunded,
      }
    : {
        type: 'SignLedgerState',
        channelId,
        stateToSign: {
          ...supported,
          outcome,
          turnNum: supported.turnNum + n,
        },
        channelsNotFunded,
      };
};

const exchangeProposals = ({
  fundingChannel: {supported, channelId},
  myLedgerProposal,
  myLedgerProposalNonce,
  theirLedgerProposal,
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolState): ProposeLedgerState | false => {
  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  // Don't propose another commit, wait for theirs
  if (myLedgerProposal) return false;

  let {outcome, channelsNotFunded} = redistributeFunds(
    supportedOutcome,
    channelsReturningFunds,
    channelsRequestingFunds
  );

  if (theirLedgerProposal && !_.isEqual(theirLedgerProposal, outcome))
    ({outcome, channelsNotFunded} = mergeProposedLedgerUpdates(
      outcome,
      theirLedgerProposal,
      supportedOutcome,
      channelsRequestingFunds,
      channelsReturningFunds
    ));

  const mergedProposalIdenticalToSupportedOutcome = _.isEqual(outcome, supportedOutcome);

  if (mergedProposalIdenticalToSupportedOutcome && channelsNotFunded.length === 0) return false;

  return {
    type: 'ProposeLedgerState',
    channelId,
    outcome: mergedProposalIdenticalToSupportedOutcome ? undefined : outcome,
    nonce: myLedgerProposalNonce + 1,
    channelsNotFunded,
  };
};

const markRequestsAsComplete = ({
  fundingChannel: {supported, channelId: ledgerChannelId},
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolState): MarkLedgerFundingRequestsAsComplete | false => {
  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);
  const supportedChannelIds = _.map(supportedOutcome.allocationItems, 'destination');

  const fundedChannels = _.chain(channelsRequestingFunds)
    .map('channelId')
    .intersection(supportedChannelIds)
    .value();

  const defundedChannels = _.chain(channelsReturningFunds)
    .map('channelId')
    .difference(supportedChannelIds)
    .value();

  if (fundedChannels.length + defundedChannels.length === 0) return false;

  return {
    type: 'MarkLedgerFundingRequestsAsComplete',
    fundedChannels,
    defundedChannels,
    ledgerChannelId,
  };
};

const hasUnhandledLedgerRequests = (ps: ProtocolState): boolean =>
  ps.channelsRequestingFunds.length + ps.channelsReturningFunds.length > 0;

const finishedExchangingProposals = (ps: ProtocolState): ps is ProtocolStateWithCommits =>
  Boolean(ps.myLedgerProposal && ps.theirLedgerProposal);

export const protocol: Protocol<ProtocolState> = (
  ps: ProtocolState
): ProtocolResult<ProtocolAction> =>
  (hasUnhandledLedgerRequests(ps) &&
    (markRequestsAsComplete(ps) ||
      (finishedExchangingProposals(ps) && exchangeSignedLedgerStates(ps)) ||
      exchangeProposals(ps))) ||
  noAction;

/**
 * Helper method to retrieve scoped data needed for ProcessLedger protocol.
 *
 * TODO: This can be heavily optimized by writing some manually crafted SQL
 */
export const getProcessLedgerQueueProtocolState = async (
  store: Store,
  ledgerChannelId: Bytes32,
  tx: Transaction
): Promise<ProtocolState> => {
  const fundingChannel = await store.getChannel(ledgerChannelId, tx);
  const ledgerRequests = await store.getPendingLedgerRequests(ledgerChannelId, tx);
  const {mine, theirs} = await store.getLedgerProposals(ledgerChannelId, tx);
  return {
    fundingChannel: runningOrError(fundingChannel),

    myLedgerProposal: mine.outcome ? checkThat(mine.outcome, isSimpleAllocation) : undefined,
    theirLedgerProposal: theirs.outcome ? checkThat(theirs.outcome, isSimpleAllocation) : undefined,

    myLedgerProposalNonce: mine.nonce,
    theirLedgerProposalNonce: theirs.nonce,

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

const runningOrError = (cs: ChannelState): ChannelStateWithSupported => {
  /* @ts-ignore */ // TODO: Figure out why TypeScript is not detecting latestSignedByMe
  if (cs.supported && cs.latestSignedByMe && cs.supported.turnNum >= 3) return cs;
  throw new Error('unreachable: ledger channel is not running');
};
