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

import {Protocol, ProtocolResult, ChannelState} from './state';
import {
  LedgerProtocolAction,
  MarkLedgerFundingRequestsAsComplete,
  noAction,
  SignLedgerStateForRequests,
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
  // TODO: All this usage of checkThat is annoying
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
}: ProtocolState): SignLedgerStateForRequests | false => {
  // Sanity-checks
  if (!supported) return false;
  if (!latestSignedByMe) return false;
  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  // Nothing left to do, no actions to take
  if (channelsPendingRequest.length === 0) return false;

  // Avoid repeating action if awaiting response (for original proposal or counterproposal)
  const receivedSomething = latestNotSignedByMe && latestNotSignedByMe.turnNum > supported.turnNum;
  const sentOriginal = !receivedSomething && latestSignedByMe.turnNum === supported.turnNum + n;
  const sentMerged = receivedSomething && latestSignedByMe.turnNum === supported.turnNum + 2 * n;
  if (sentOriginal || sentMerged) return false;

  // Expect the new outcome to be supported allocating _all_ pending requests
  const myExpectedOutcome = foldAllocateToTarget(supportedOutcome, channelsPendingRequest);

  let newOutcome: Outcome = myExpectedOutcome;
  let newTurnNum: number = supported.turnNum + n;

  /**
   * If I already received a proposal then (1) check if it is conflicting and
   * if it is, then (2) sign the intersection (3) with an increased turn number,
   * but otherwise just continue as normal (my signature will create a support)
   */
  if (receivedSomething) {
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

  return {
    ...signState({
      channelId,
      ...supported,
      outcome: newOutcome,
      turnNum: newTurnNum,
    }),

    type: 'SignLedgerStateForRequests',
  };
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
): ProtocolResult<LedgerProtocolAction> =>
  markRequestsAsComplete(ps) || computeNewOutcome(ps) || noAction;
