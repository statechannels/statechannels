import {
  MachineConfig,
  Action,
  DefaultGuardType,
  GuardPredicate,
  ConditionPredicate,
  StateSchema,
  Machine
} from 'xstate';
import {Allocations, Participant} from '@statechannels/client-api-schema';
import {MachineFactory, Store} from '@statechannels/wallet-protocols';
import {sendDisplayMessage} from '../messaging';

interface WorkflowActions {
  hideUi: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>;
}
interface WorkflowGuards {
  noBudget:
    | GuardPredicate<WorkflowContext, WorkflowEvent>
    | ConditionPredicate<WorkflowContext, WorkflowEvent>;
}
// While this context info may not be used by the workflow
// it may be used when displaying a UI
export interface WorkflowContext {
  participants: Participant[];
  allocations: Allocations;
  appDefinition: string;
  appData: string;
  chainId: string;
  challengeDuration: number;
}

interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  states: {
    needUserConfirmation: {};
    waitForUserConfirmation: {};
    // TODO: Is it possible to type these as type:'final' ?
    done: {};
    failure: {};
  };
}

interface UserApproves {
  type: 'USER_APPROVES';
}
interface UserRejects {
  type: 'USER_REJECTS';
}
type WorkflowEvent = UserApproves | UserRejects;

const generateConfig = (
  actions: WorkflowActions,
  guards: WorkflowGuards
): MachineConfig<WorkflowContext, WorkflowStateSchema, WorkflowEvent> => ({
  id: 'confirm-create-channel',
  initial: 'needUserConfirmation',
  states: {
    needUserConfirmation: {
      on: {
        '': [
          {
            target: 'waitForUserConfirmation',
            cond: guards.noBudget,
            actions: [actions.displayUi]
          },
          {
            target: 'done'
          }
        ]
      }
    },
    waitForUserConfirmation: {
      on: {
        USER_APPROVES: {target: 'done', actions: [actions.hideUi]},
        USER_REJECTS: {target: 'failure', actions: [actions.hideUi]}
      }
    },
    done: {type: 'final'},
    failure: {type: 'final'}
  }
});

const mockActions: WorkflowActions = {
  hideUi: 'hideUi',
  displayUi: 'displayUi'
};
const mockGuards = {
  noBudget: {
    // TODO: Using a guard predicate type allows for the name to be displayed in the visualizer
    // We should probably find a better way of doing this or not bother typing guards
    type: 'xstate.guard' as DefaultGuardType,
    name: 'noBudget',
    predicate: (context, event) => true
  }
};
export const mockOptions = {actions: mockActions, guards: mockGuards};
export const config = generateConfig(mockActions, mockGuards);

export const confirmChannelCreationWorkflow: MachineFactory<WorkflowContext, WorkflowEvent> = (
  _store: Store,
  context: WorkflowContext
) => {
  // TODO: Once budgets are a thing this should check for a budget
  const guards = {noBudget: (context, event) => true};
  const actions = {
    // TODO: We should probably set up some standard actions for all workflows
    displayUi: (context, event) => {
      sendDisplayMessage('Show');
    },
    hideUi: (context, event) => {
      sendDisplayMessage('Hide');
    }
  };

  const config = generateConfig(actions, guards);
  return Machine(config).withConfig({}, context);
};
