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

  // Nothing left to do, no actions to take
  if (channelsPendingRequest.length === 0) return false;

  // Avoid repeating action if awaiting response (for original proposal or counterproposal)
  const receivedSomething = latestNotSignedByMe && latestNotSignedByMe.turnNum > supported.turnNum;
  const sentOriginal = !receivedSomething && latestSignedByMe.turnNum === supported.turnNum + n;
  const sentMerged = receivedSomething && latestSignedByMe.turnNum === supported.turnNum + 2 * n;
  if (sentOriginal || sentMerged) return false;

  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  const channelsToFund = channelsPendingRequest;

  const myExpectedOutcome = foldAllocateToTarget(supportedOutcome, channelsToFund);

  let newOutcome: Outcome;
  let newTurnNum: number;
  let channelsNotFunded: ChannelState[] = [];

  if (receivedSomething) {
    const {
      outcome: conflictingOutcome,
      turnNum: conflictingTurnNum,
    } = latestNotSignedByMe as SignedStateWithHash;

    const theirLatestOutcome = checkThat(conflictingOutcome, isSimpleAllocation);
    const {allocationItems} = mergedOutcome(myExpectedOutcome, theirLatestOutcome);

    const intersectingChannels = channelsToFund.filter(({channelId}) =>
      _.some(allocationItems, ['destination', channelId])
    );

    channelsNotFunded = _.xorBy(channelsToFund, intersectingChannels, 'channelId');

    // Can't just check unmetRequests because they may have
    // sent over an update that we don't consider to be a request
    newTurnNum = _.isEqual(theirLatestOutcome, myExpectedOutcome)
      ? conflictingTurnNum
      : conflictingTurnNum + n;

    newOutcome = foldAllocateToTarget(supportedOutcome, intersectingChannels);
  } else {
    newOutcome = myExpectedOutcome;
    newTurnNum = supported.turnNum + n;
  }

  return {
    ...signState({
      channelId,
      ...supported,
      outcome: newOutcome,
      turnNum: newTurnNum,
    }),

    type: 'SignLedgerStateForRequests',

    // The set of channels which neither agree on go back to pending
    unmetRequests: channelsNotFunded.map(channel => channel.channelId),
  };
};

const markRequestsAsComplete = ({
  fundingChannel: {supported},
  channelsPendingRequest,
}: ProtocolState): MarkLedgerFundingRequestsAsComplete | false => {
  if (!supported) return false;
  if (channelsPendingRequest.length === 0) return false;

  const {allocationItems} = checkThat(supported.outcome, isSimpleAllocation);
  const doneRequests = _.intersection(
    allocationItems.map(allocationItem => allocationItem.destination),
    channelsPendingRequest.map(destination => destination.channelId)
  ).filter(
    req =>
      !_.includes(
        supported.participants.map(p => p.destination),
        req
      )
  );
  return (
    doneRequests.length > 0 && {
      type: 'MarkLedgerFundingRequestsAsComplete',
      doneRequests,
    }
  );
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
