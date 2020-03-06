import {StateSchema, State, Action, MachineConfig, Machine, StateMachine} from 'xstate';
import {SiteBudget} from '../store/types';
import {sendDisplayMessage} from '../messaging';
import {Store} from '../store/memory-store';
interface UserApproves {
  type: 'USER_APPROVES_BUDGET';
}
interface UserRejects {
  type: 'USER_REJECTS_BUDGET';
}
export type WorkflowEvent = UserApproves | UserRejects;

export interface WorkflowContext {
  budget?: SiteBudget;
}

export interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  states: {
    waitForUserApproval: {};
    done: {};
    failure: {};
  };
}
export type WorkflowState = State<WorkflowContext, WorkflowEvent, WorkflowStateSchema, any>;

export interface WorkflowActions {
  hideUi: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>;
}
export type StateValue = keyof WorkflowStateSchema['states'];

const generateConfig = (
  actions: WorkflowActions
): MachineConfig<WorkflowContext, WorkflowStateSchema, WorkflowEvent> => ({
  id: 'approve-budget-and-fund',
  initial: 'waitForUserApproval',
  states: {
    waitForUserApproval: {
      entry: [actions.displayUi],
      on: {
        USER_APPROVES_BUDGET: {target: 'done'},
        USER_REJECTS_BUDGET: {target: 'failure'}
      }
    },
    done: {type: 'final', data: context => context},
    failure: {type: 'final'}
  }
});

const mockActions: WorkflowActions = {
  hideUi: 'hideUi',
  displayUi: 'displayUi'
};
export const mockOptions = {actions: mockActions};

const actions = {
  // TODO: We should probably set up some standard actions for all workflows
  displayUi: () => {
    sendDisplayMessage('Show');
  },
  hideUi: () => {
    sendDisplayMessage('Hide');
  }
};

export const config = generateConfig(actions);

export const approveBudgetAndFundWorkflow = (
  _store: Store,
  context: WorkflowContext
): WorkflowMachine => {
  return Machine(config).withConfig({}, context) as WorkflowMachine;
};

export type WorkflowMachine = StateMachine<WorkflowContext, StateSchema, WorkflowEvent, any>;
