import {
  Message,
  State,
  Participant,
  isSimpleAllocation,
  calculateChannelId
} from './xstate-wallet-internals';
import {ethers} from 'ethers';
import {BigNumber} from 'ethers/utils';
import * as R from 'ramda';
import {cHubParticipantId} from '../constants';
import {SimpleAllocation} from '@statechannels/xstate-wallet/src/store/types';

export function depositsToMake(
  message: Message
): {channelId: string; amountToDeposit: BigNumber}[] {
  return message.signedStates
    .filter(state => state.turnNum.eq(ethers.constants.Zero))
    .filter(state => state.participants.length === 2)
    .filter(state => isSimpleAllocation(state.outcome))
    .map(state => ({
      channelId: calculateChannelId(state),
      amountToDeposit: amountToDeposit(state)
    }));
}

function amountToDeposit(state: State): BigNumber {
  const hubIndex = R.findIndex<Participant>(R.propEq('participantId', cHubParticipantId))(
    state.participants
  );
  // Is there a way to narrow the type in the filtering stage above?
  return R.nth(hubIndex, (state.outcome as SimpleAllocation).allocationItems).amount;
}
