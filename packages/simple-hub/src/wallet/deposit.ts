import {
  Message,
  State,
  calculateChannelId,
  ChannelConstants,
  SimpleAllocation
} from './xstate-wallet-internals';
import {ethers} from 'ethers';
import {BigNumber} from 'ethers/utils';
import {cHubChainAddress} from '../constants';
import _ from 'lodash/fp';

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
  const simpleAllocationStates = _.filter(isSimpleAllocationState, message.signedStates);
  return simpleAllocationStates
    .filter(state => state.participants.length === 2)
    .filter(
      state =>
        _.findIndex(
          allocationItem => allocationItem.destination === cHubChainAddress,
          state.outcome.allocationItems
        ) === 0
    )
    .filter(state => state.turnNum.eq(ethers.constants.Zero))
    .map(state => ({
      channelId: calculateChannelId(state),
      amountToDeposit: state.outcome.allocationItems[0].amount
    }));
}
