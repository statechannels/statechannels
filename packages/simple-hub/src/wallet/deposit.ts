import {
  Message,
  State,
  Participant,
  calculateChannelId,
  ChannelConstants
} from './xstate-wallet-internals';
import {ethers} from 'ethers';
import {BigNumber} from 'ethers/utils';
import * as R from 'ramda';
import {cHubParticipantId} from '../constants';
import {SimpleAllocation} from '@statechannels/xstate-wallet/src/store/types';
import _ from 'lodash';

interface SimpleAllocationStateVariables {
  outcome: SimpleAllocation;
  turnNum: BigNumber;
  appData: string;
  isFinal: boolean;
}
export interface SimpleAllocationState extends ChannelConstants, SimpleAllocationStateVariables {}

export function isSimpleAllocationState(state: State): state is SimpleAllocationState {
  return state.outcome.type === 'SimpleAllocation';
}

export function depositsToMake(
  message: Message
): {channelId: string; amountToDeposit: BigNumber}[] {
  const simpleAllocationStates = _.filter(message.signedStates, isSimpleAllocationState);
  return simpleAllocationStates
    .filter(state => state.participants.length === 2)
    .filter(state => state.turnNum.eq(ethers.constants.Zero))
    .map(state => ({
      channelId: calculateChannelId(state),
      amountToDeposit: amountToDeposit(state)
    }));
}

function amountToDeposit(state: SimpleAllocationState): BigNumber {
  const hubIndex = R.findIndex<Participant>(R.propEq('participantId', cHubParticipantId))(
    state.participants
  );
  return R.nth(hubIndex, state.outcome.allocationItems).amount;
}
