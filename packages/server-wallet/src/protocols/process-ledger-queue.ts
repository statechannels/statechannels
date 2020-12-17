/**
 * Follows an algorithm to guarantee that an agreed upon ledger update will be signed by
 * 2 participants in at most 2 round trips. Either can propose a state at any time and either
 * can counterpropose a state at any time. However, if they follow the algorithm below they
 * should always be able to compute the expected outcome by the second round trip.
 *
 * Algorithm:
 *
 *  Let O be the outcome of the currently supported state S.
 *
 *   i. Create my own ledger update. If I have already proposed a new ledger update, go to (ii).
 *      Else:
 *      Let D₁ be the pending defund ledger updates. Remove D₁ from O.
 *
 *      Sort pending ledger updates by channel nonce. Call them F.
 *      Add from F when the outcome O "affords it", and mark with an error otherwise.
 *      Call F₁ those we could "afford" to add to O.
 *      For those we cannot afford, mark as ‘failed’ with insufficient funds.
 *
 *      My ledger update is (D₁, F₁). Send it to my peer.
 *
 *  ii. If there is an existing peer proposal for a ledger update D₂ and F₂, go to (iii).
 *      Else, ask for their ledger update and return.
 *
 * iii. Compute the next outcome O'.
 *      a. Compute D = D₁ ⋂ D₂. Remove all items D from O.
 *
 *      b. Compute F = F₁ ∩ F₂.
 *      Add from F when the outcome O "affords it".
 *
 *      c. If O' !== O, sign a state S' with outcome O' and turn number S.turnNum + 1.
 *         Else erase both sent and received proposals and start again at (i).
 *
 * Notes:
 *   - In the implementation below, instead of sending (D, F) to my peer, a computed
 *     outcome based on applying D and F to O is sent and the peer is expected to be
 *     able to "deconstruct" it into D and F if it is not equal to their proposal. In
 *     a future implementation we will send (D, F) instead of the computed proposal
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
  MarkInsufficientFunds,
  MarkLedgerFundingRequestsAsComplete,
  noAction,
  ProposeLedgerUpdate,
  ProtocolAction,
  SignLedgerUpdate,
} from './actions';

export type ProtocolState = {
  fundingChannel: ChannelStateWithSupported;
  theirLedgerProposal: {proposal: SimpleAllocation | null; nonce: number};
  myLedgerProposal: {proposal: SimpleAllocation | null; nonce: number};
  channelsRequestingFunds: ChannelState[];
  channelsReturningFunds: ChannelState[];
};

type ProtocolStateWithDefinedProposals = ProtocolState & {
  theirLedgerProposal: {proposal: SimpleAllocation; nonce: number};
  myLedgerProposal: {proposal: SimpleAllocation; nonce: number};
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
  fundingChannel: {supported, latestSignedByMe, latest, channelId},
  myLedgerProposal: {proposal: myProposedOutcome},
  theirLedgerProposal: {proposal: theirProposedOutcome},
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolStateWithDefinedProposals): DismissLedgerProposals | SignLedgerUpdate | false => {
  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);
  const nextTurnNum = supported.turnNum + 1;

  // Already signed something and waiting for reply
  if (latestSignedByMe.turnNum === nextTurnNum) return false;

  const outcome = _.isEqual(theirProposedOutcome, myProposedOutcome)
    ? myProposedOutcome
    : mergeProposedLedgerUpdates(
        myProposedOutcome,
        theirProposedOutcome,
        supportedOutcome,
        channelsRequestingFunds,
        channelsReturningFunds
      ).outcome;

  const receivedReveal = latest.turnNum === nextTurnNum;
  if (receivedReveal && !_.isEqual(outcome, latest.outcome))
    // TODO: signals a corrupt / broken counterparty wallet, what do we want to do here?
    throw new Error('received a signed reveal that is _not_ what we agreed on :/');

  return _.isEqual(outcome, supportedOutcome)
    ? {
        type: 'DismissLedgerProposals',
        channelId,
      }
    : {
        type: 'SignLedgerUpdate',
        channelId,
        stateToSign: {
          turnNum: nextTurnNum,
          outcome,
          appData: '0x00',
          isFinal: false,
        },
      };
};

const exchangeProposals = ({
  fundingChannel: {supported, channelId, myIndex, participants},
  myLedgerProposal: {proposal, nonce},
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolState): MarkInsufficientFunds | ProposeLedgerUpdate | false => {
  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  // Don't propose another commit, wait for theirs
  if (proposal) return false;

  const {outcome, channelsNotFunded} = redistributeFunds(
    supportedOutcome,
    channelsReturningFunds,
    channelsRequestingFunds
  );

  return _.isEqual(outcome, supportedOutcome)
    ? channelsNotFunded.length > 0
      ? {
          type: 'MarkInsufficientFunds',
          channelId,
          channelsNotFunded,
        }
      : false
    : {
        type: 'ProposeLedgerUpdate',
        channelId,
        outcome,
        nonce: nonce + 1,
        signingAddress: participants[myIndex].signingAddress,
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

const finishedExchangingProposals = (ps: ProtocolState): ps is ProtocolStateWithDefinedProposals =>
  Boolean(ps.myLedgerProposal.proposal && ps.theirLedgerProposal.proposal);

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
  const fundingChannel = await store.getChannelState(ledgerChannelId, tx);
  const ledgerRequests = await store.getPendingLedgerRequests(ledgerChannelId, tx);
  const proposals = await store.getLedgerProposals(ledgerChannelId, tx);
  const [[mine], [theirs]] = _.partition(proposals, [
    'signingAddress',
    fundingChannel.participants[fundingChannel.myIndex].signingAddress,
  ]);
  return {
    fundingChannel: runningOrError(fundingChannel),

    myLedgerProposal: mine ?? {proposal: null, nonce: 0},
    theirLedgerProposal: theirs ?? {proposal: null, nonce: 0},

    channelsRequestingFunds: await Promise.all<ChannelState>(
      compose(
        map(({channelToBeFunded}: LedgerRequestType) =>
          store.getChannelState(channelToBeFunded, tx)
        ),
        filter(['status', 'pending']),
        filter(['type', 'fund'])
      )(ledgerRequests)
    ).then(sortByNonce),

    channelsReturningFunds: await Promise.all<ChannelState>(
      compose(
        map(({channelToBeFunded}: LedgerRequestType) =>
          store.getChannelState(channelToBeFunded, tx)
        ),
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
