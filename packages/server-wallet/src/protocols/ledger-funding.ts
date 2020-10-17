import _ from 'lodash';
import {
  allocateToTarget,
  checkThat,
  isSimpleAllocation,
  SimpleAllocation,
} from '@statechannels/wallet-core';

import {Bytes32} from '../type-aliases';

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
  channelsWithInflightRequest: ChannelState[];
};

const newOutcomeBasedOnMyPendingUpdates = (
  supportedOutcome: SimpleAllocation,
  channelsPendingRequest: ChannelState[]
): SimpleAllocation =>
  // This could fail at some point if there is no longer space to fund stuff
  // TODO: Handle that case
  // } catch (e) {
  //   if (e.toString() === 'Insufficient funds in fundingChannel channel')
  // }
  // TODO: All this usage of checkThat is annoying
  channelsPendingRequest.reduce(
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
    supportedOutcome
  );

const outcomeMergedWithLatestState = (
  latestOutcome: SimpleAllocation,
  newOutcome: SimpleAllocation
): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: newOutcome.assetHolderAddress,
  allocationItems: _.intersection(latestOutcome.allocationItems, newOutcome.allocationItems),
});

const computeNewOutcome = ({
  fundingChannel: {supported, latest, latestSignedByMe, channelId},
  channelsPendingRequest,
}: ProtocolState): SignLedgerStateForRequests | false => {
  if (!supported) return false;
  if (!latestSignedByMe) return false;

  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);
  const latestOutcome = checkThat(latest.outcome, isSimpleAllocation);
  const myLatestOutcome = checkThat(latestSignedByMe.outcome, isSimpleAllocation);

  const counterPartyProposedNewUpdate = latest.turnNum >= supported.turnNum + 2;

  let newTurnNum = supported.turnNum + 2;
  let newOutcome = newOutcomeBasedOnMyPendingUpdates(supportedOutcome, channelsPendingRequest);
  let unmetRequests: Bytes32[] = [];

  if (counterPartyProposedNewUpdate) {
    if (!_.isEqual(newOutcome, latestOutcome)) {
      const mergedOutcome = outcomeMergedWithLatestState(latestOutcome, newOutcome);
      unmetRequests = _.xor(mergedOutcome.allocationItems, newOutcome.allocationItems).map(
        x => x.destination
      );
      newTurnNum += 2;
      newOutcome = mergedOutcome;
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

    // The setof channels which neither agree on go back to pending
    unmetRequests: unmetRequests.filter(
      req =>
        !_.includes(
          supported.participants.map(p => p.destination),
          req
        )
    ),

    // The unique set of channels they both agreed to fund get marked done
    inflightRequests: _.xor(myLatestOutcome.allocationItems, newOutcome.allocationItems)
      .map(x => x.destination)
      .filter(
        req =>
          !_.includes(
            supported.participants.map(p => p.destination),
            req
          )
      ),
  };
};

const markRequestsAsComplete = ({
  fundingChannel: {supported},
  channelsWithInflightRequest,
}: ProtocolState): MarkLedgerFundingRequestsAsComplete | false => {
  if (!supported) return false;
  const {allocationItems} = checkThat(supported.outcome, isSimpleAllocation);
  const doneRequests = _.xor(
    allocationItems.map(allocationItem => allocationItem.destination),
    channelsWithInflightRequest.map(destination => destination.channelId)
  );
  return (
    doneRequests.length > 0 && {
      type: 'MarkLedgerFundingRequestsAsComplete',
      doneRequests: doneRequests.filter(
        req =>
          !_.includes(
            supported.participants.map(p => p.destination),
            req
          )
      ),
    }
  );
};

const hasPendingFundingRequests = (ps: ProtocolState): boolean =>
  ps.channelsPendingRequest.length > 0;

const hasInflightFundingRequests = (ps: ProtocolState): boolean =>
  ps.channelsWithInflightRequest.length > 0;

const handingPendingRequests = (ps: ProtocolState): SignLedgerStateForRequests | false =>
  hasPendingFundingRequests(ps) && computeNewOutcome(ps);

const handleCompleteRequests = (ps: ProtocolState): MarkLedgerFundingRequestsAsComplete | false =>
  hasInflightFundingRequests(ps) && markRequestsAsComplete(ps);

// NOTE: Deciding _not_ to care about turn taking
// const myTurnToDoLedgerStuff = ({
//   fundingChannel: {supported, participants, myIndex},
// }: ProtocolState): boolean =>
//   !!supported && (supported.turnNum + 1) % participants.length === myIndex;

export const protocol: Protocol<ProtocolState> = (
  ps: ProtocolState
): ProtocolResult<LedgerProtocolAction> =>
  handingPendingRequests(ps) || handleCompleteRequests(ps) || noAction;
