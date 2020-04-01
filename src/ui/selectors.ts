import {
  WorkflowState as AppWorkflowState,
  StateValue as AppStateValue
} from '../workflows/application';
import {WorkflowState as CCCWorkflowState} from '../workflows/confirm';
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
  // TODO: This is fragile and should be revisited at some point
  const joinInConfirmCreateChannel =
    getApplicationStateValue(applicationWorkflowState) === 'joiningChannel' &&
    applicationWorkflowState.value['joiningChannel'] &&
    applicationWorkflowState.value['joiningChannel']['confirmChannelCreation'] ===
      'invokeCreateChannelConfirmation';

  return (
    joinInConfirmCreateChannel ||
    getApplicationStateValue(applicationWorkflowState) === 'creatingChannel'
  );
}

export function isApplicationOpening(applicationWorkflowState: AppWorkflowState): boolean {
  const stateValue = getApplicationStateValue(applicationWorkflowState);
  return (
    stateValue === 'joiningChannel' ||
    stateValue === 'creatingChannel' ||
    stateValue === 'openChannelAndFundProtocol'
  );
}

export function getApplicationOpenProgress(applicationWorkflowState: AppWorkflowState): number {
  switch (getApplicationStateValue(applicationWorkflowState)) {
    case 'joiningChannel':
    case 'creatingChannel':
      return 0.33;
    case 'openChannelAndFundProtocol':
      return 0.66;
    default:
      return 1;
  }
}

export function getAmountsFromBudget(
  budget: SiteBudget
): {playerAmount: BigNumber; hubAmount: BigNumber} {
  const pending = budget.forAsset[ETH_ASSET_HOLDER_ADDRESS];
  if (!pending) throw new Error('No eth budget found');
  const {availableReceiveCapacity, availableSendCapacity} = pending;
  return {playerAmount: availableSendCapacity, hubAmount: availableReceiveCapacity};
}
