import {
  Message,
  State,
  calculateChannelId,
  ChannelConstants,
  SimpleAllocation,
  makeDestination
} from './xstate-wallet-internals';
import {BigNumber} from 'ethers';
import {cHubChainDestination} from '../constants';
import _ from 'lodash/fp';

interface SimpleAllocationStateVariables {
  outcome: SimpleAllocation;
  turnNum: number;
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
          allocationItem =>
            makeDestination(allocationItem.destination) === makeDestination(cHubChainDestination),
          state.outcome.allocationItems
        ) === 0
    )
    .filter(state => state.turnNum === 0)
    .map(state => ({
      channelId: calculateChannelId(state),
      amountToDeposit: state.outcome.allocationItems[0].amount
    }));
}
