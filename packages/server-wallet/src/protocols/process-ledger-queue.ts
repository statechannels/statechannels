import {compose, map, filter} from 'lodash/fp';
import _ from 'lodash';
import {
  allocateToTarget,
  AllocationItem,
  BN,
  checkThat,
  isSimpleAllocation,
  Outcome,
  SignedStateWithHash,
  SimpleAllocation,
} from '@statechannels/wallet-core';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';
import {LedgerRequestType} from '../models/ledger-requests';

import {Protocol, ProtocolResult, ChannelState} from './state';
import {
  MarkLedgerFundingRequestsAsComplete,
  noAction,
  ProtocolAction,
  SignState,
  signState,
} from './actions';

export type ProtocolState = {
  fundingChannel: ChannelState;
  channelsPendingRequest: ChannelState[];
};

const allocationItemComparator = (a: AllocationItem, b: AllocationItem): boolean =>
  a.destination === b.destination && BN.eq(a.amount, b.amount);

const foldAllocateToTarget = (
  original: SimpleAllocation,
  allocationTargets: ChannelState[]
): SimpleAllocation =>
  // This could fail at some point if there is no longer space to fund stuff
  // TODO: Handle that case
  // } catch (e) {
  //   if (e.toString() === 'Insufficient funds in fundingChannel channel')
  // }
  allocationTargets.reduce(
    (outcome, {channelId, supported}) =>
      checkThat(
        allocateToTarget(
          outcome,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          checkThat(supported!.outcome, isSimpleAllocation).allocationItems,
          channelId
        ),
        isSimpleAllocation
      ),
    original
  );

const mergedOutcome = (a: SimpleAllocation, b: SimpleAllocation): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: b.assetHolderAddress,
  allocationItems: _.intersectionWith(
    a.allocationItems,
    b.allocationItems,
    allocationItemComparator
  ),
});

const computeNewOutcome = ({
  fundingChannel: {
    supported,
    latestNotSignedByMe,
    latestSignedByMe,
    channelId,
    participants: {length: n},
  },
  channelsPendingRequest,
}: ProtocolState): SignState | false => {
  // Sanity-checks
  if (!supported) return false;
  if (!latestSignedByMe) return false;

  const myLatestOutcome = checkThat(latestSignedByMe.outcome, isSimpleAllocation);
  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  // Nothing left to do, no actions to take
  if (channelsPendingRequest.length === 0) return false;

  // TODO: Sort should be somewhere else
  channelsPendingRequest = channelsPendingRequest.sort(
    (a, b) => a.latest.channelNonce - b.latest.channelNonce
  );

  const receivedOriginal =
    latestNotSignedByMe && latestNotSignedByMe.turnNum === supported.turnNum + 2;
  const receivedMerged =
    latestNotSignedByMe && latestNotSignedByMe.turnNum === supported.turnNum + 2 * n;
  const sentOriginal = latestSignedByMe.turnNum === supported.turnNum + n;
  const sentMerged = latestSignedByMe.turnNum === supported.turnNum + 2 * n;

  // Avoid repeating action if awaiting response (for original proposal or counterproposal)
  if ((!receivedOriginal && sentOriginal) || (!receivedMerged && sentMerged)) return false;

  // The new outcome is the supported outcome, funding all pending ledger requests
  const myExpectedOutcome =
    // If you already proposed an update though, re-use that,
    // don't re-compute (set of pending requests may have changed)
    sentOriginal || sentMerged
      ? myLatestOutcome
      : foldAllocateToTarget(supportedOutcome, channelsPendingRequest);

  let newOutcome: Outcome = myExpectedOutcome;
  let newTurnNum: number = supported.turnNum + n;

  /**
   * If I already received a proposal then (1) check if it is conflicting and
   * if it is, then (2) sign the intersection (3) with an increased turn number,
   * but otherwise just continue as normal (my signature will create a support)
   */
  if (receivedOriginal || receivedMerged) {
    const {
      outcome: conflictingOutcome,
      turnNum: conflictingTurnNum,
    } = latestNotSignedByMe as SignedStateWithHash;

    const theirLatestOutcome = checkThat(conflictingOutcome, isSimpleAllocation);

    if (!_.isEqual(theirLatestOutcome, myExpectedOutcome) /* (1) */) {
      const merged = mergedOutcome(myExpectedOutcome, theirLatestOutcome);

      const intersectingChannels = channelsPendingRequest.filter(({channelId}) =>
        _.some(merged.allocationItems, ['destination', channelId])
      );

      newOutcome = foldAllocateToTarget(supportedOutcome, intersectingChannels); // (2)
      newTurnNum = conflictingTurnNum + n; // (3)
    }
  }

  return signState({
    channelId,
    ...supported,
    outcome: newOutcome,
    turnNum: newTurnNum,
  });
};

const markRequestsAsComplete = ({
  fundingChannel: {supported},
  channelsPendingRequest,
}: ProtocolState): MarkLedgerFundingRequestsAsComplete | false => {
  if (!supported) return false;
  if (channelsPendingRequest.length === 0) return false;

  const doneRequests = channelsPendingRequest.filter(({channelId}) =>
    _.some(
      checkThat(supported.outcome, isSimpleAllocation).allocationItems,
      allocationItem => allocationItem.destination === channelId
    )
  );

  if (doneRequests.length === 0) return false;

  return {
    type: 'MarkLedgerFundingRequestsAsComplete',
    doneRequests: doneRequests.map(channel => channel.channelId),
  };
};

// NOTE: Deciding _not_ to care about turn taking
// const myTurnToDoLedgerStuff = ({
//   fundingChannel: {supported, participants, myIndex},
// }: ProtocolState): boolean =>
//   !!supported && (supported.turnNum + 1) % participants.length === myIndex;

export const protocol: Protocol<ProtocolState> = (
  ps: ProtocolState
): ProtocolResult<ProtocolAction> =>
  markRequestsAsComplete(ps) || computeNewOutcome(ps) || noAction;

/**
 * Helper method to retrieve scoped data needed for ProcessLedger protocol.
 */
export const getProcessLedgerQueueProtocolState = async (
  store: Store,
  ledgerChannelId: Bytes32,
  tx: Transaction
): Promise<ProtocolState> => {
  return {
    fundingChannel: await store.getChannel(ledgerChannelId, tx),
    channelsPendingRequest: await Promise.all(
      compose(
        map(({fundingChannelId}: LedgerRequestType) => store.getChannel(fundingChannelId, tx)),
        filter(['status', 'pending'])
      )(await store.getPendingLedgerRequests(ledgerChannelId, tx))
    ),
  };
};
