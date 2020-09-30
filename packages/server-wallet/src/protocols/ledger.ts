import _ from 'lodash';
import {
  allocateToTarget,
  checkThat,
  isSimpleAllocation,
  SimpleAllocation,
} from '@statechannels/wallet-core';

import {Protocol, ProtocolResult, ChannelState} from './state';
import {LedgerProtocolAction, noAction, SignState, signState} from './actions';

export type ProtocolState = {
  ledger: ChannelState;
  channelsPendingRequest: ChannelState[];
};

const newOutcomeBasedOnMyPendingUpdates = ({
  ledger,
  channelsPendingRequest,
}: ProtocolState): SimpleAllocation =>
  // This could fail at some point if there is no longer space to fund stuff
  // TODO: Handle that case
  // } catch (e) {
  //   if (e.toString() === 'Insufficient funds in ledger channel')
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    checkThat(ledger.supported!.outcome, isSimpleAllocation)
  );

const outcomeMergedWithLatestState = (
  latestOutcome: SimpleAllocation,
  newOutcome: SimpleAllocation
): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: newOutcome.assetHolderAddress,
  allocationItems: _.intersection(latestOutcome.allocationItems, newOutcome.allocationItems),
});

const computeNewOutcome = ({ledger, channelsPendingRequest}: ProtocolState): SignState | false => {
  let newOutcome = newOutcomeBasedOnMyPendingUpdates({ledger, channelsPendingRequest});
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let newTurnNum = ledger.latestSignedByMe!.turnNum + 2;

  const counterPartyProposedNewUpdate =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ledger.latest.turnNum === ledger.latestSignedByMe!.turnNum + 2;

  if (counterPartyProposedNewUpdate) {
    const proposedOutcome = checkThat(ledger.latest.outcome, isSimpleAllocation);
    if (!_.isEqual(newOutcome, proposedOutcome)) {
      newTurnNum = ledger.latest.turnNum + 2;
      newOutcome = outcomeMergedWithLatestState(proposedOutcome, newOutcome);
    }
  }

  // FIXME: Need to somehow also dispatch an action to do this:
  // updates.map(({channelId}) => {
  //   this.pending_updates[channelId].status = 'inflight';
  // });

  return signState({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...ledger.supported!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    outcome: newOutcome!,
    turnNum: newTurnNum,
    channelId: ledger.channelId,
  });
};

const hasPendingFundingRequests = (ps: ProtocolState): boolean =>
  ps.channelsPendingRequest.length > 0;

const handleFundingRequests = (ps: ProtocolState): SignState | false =>
  hasPendingFundingRequests(ps) && computeNewOutcome(ps);

export const protocol: Protocol<ProtocolState> = (
  ps: ProtocolState
): ProtocolResult<LedgerProtocolAction> => handleFundingRequests(ps) || noAction;
