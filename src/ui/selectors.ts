import {
  WorkflowState as AppWorkflowState,
  StateValue as AppStateValue
} from '../workflows/application';
import {WorkflowState as CCCWorkflowState} from '../workflows/confirm-create-channel';
import {SiteBudget} from '../store/types';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {BigNumber} from 'ethers/utils';

export function getApplicationStateValue(
  applicationWorkflowState: AppWorkflowState
): AppStateValue {
  if (typeof applicationWorkflowState.value === 'string') {
    return applicationWorkflowState.value as AppStateValue;
  } else {
    return Object.keys(applicationWorkflowState.value)[0] as AppStateValue;
  }
}

export function getConfirmCreateChannelState(
  applicationWorkflowState: AppWorkflowState
): CCCWorkflowState {
  return applicationWorkflowState.children[Object.keys(applicationWorkflowState.children)[0]]
    .state as CCCWorkflowState;
}

// TODO:Ideally this should be a type guard
export function isConfirmCreateChannel(applicationWorkflowState: AppWorkflowState): boolean {
  return (
    getApplicationStateValue(applicationWorkflowState) === 'confirmJoinChannelWorkflow' ||
    getApplicationStateValue(applicationWorkflowState) === 'confirmCreateChannelWorkflow'
  );
}

export function isApplicationOpening(applicationWorkflowState: AppWorkflowState): boolean {
  const stateValue = getApplicationStateValue(applicationWorkflowState);
  return (
    stateValue === 'confirmJoinChannelWorkflow' ||
    stateValue === 'confirmCreateChannelWorkflow' ||
    stateValue === 'createChannelInStore' ||
    stateValue === 'openChannelAndFundProtocol'
  );
}

export function getApplicationOpenProgress(applicationWorkflowState: AppWorkflowState): number {
  switch (getApplicationStateValue(applicationWorkflowState)) {
    case 'confirmJoinChannelWorkflow':
    case 'confirmCreateChannelWorkflow':
      return 0.25;
    case 'createChannelInStore':
      return 0.3;
    // TODO: We should create a selector that gets a state value or progress value for this
    case 'openChannelAndFundProtocol':
      return 0.65;
    default:
      return 1;
  }
}

export function getAmountsFromPendingBudget(
  budget: SiteBudget
): {playerAmount: BigNumber; hubAmount: BigNumber} {
  const {pending} = budget.budgets[ETH_ASSET_HOLDER_ADDRESS];
  const {playerAmount, hubAmount} = pending;
  return {playerAmount, hubAmount};
}
