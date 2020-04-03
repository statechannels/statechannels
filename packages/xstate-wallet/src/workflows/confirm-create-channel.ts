import {MachineConfig, Action, StateSchema, Machine, Condition, StateMachine, State} from 'xstate';
import {Participant} from '@statechannels/client-api-schema';
import {createMockGuard} from '../utils';
import {Store} from '../store';
import {SimpleAllocation} from '../store/types';
import {BigNumber} from 'ethers/utils';
import {MessagingServiceInterface} from '../messaging';

interface WorkflowActions {
  hideUi: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>;
}
interface WorkflowGuards {
  noBudget: Condition<WorkflowContext, WorkflowEvent>;
}
// While this context info may not be used by the workflow
// it may be used when displaying a UI
export interface WorkflowContext {
  participants: Participant[];
  outcome: SimpleAllocation;
  appDefinition: string;
  appData: string;
  chainId: string;
  challengeDuration: BigNumber;
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

export type StateValue = keyof WorkflowStateSchema['states'];

export type WorkflowState = State<WorkflowContext, WorkflowEvent, WorkflowStateSchema, any>;

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
            cond: guards.noBudget
          },
          {
            target: 'done'
          }
        ]
      }
    },
    waitForUserConfirmation: {
      on: {
        USER_APPROVES: {target: 'done'},
        USER_REJECTS: {target: 'failure', actions: [actions.hideUi]}
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
const mockGuards = {
  noBudget: createMockGuard('noBudget')
};
export const mockOptions = {actions: mockActions, guards: mockGuards};
export const mockConfig = generateConfig(mockActions, mockGuards);
const guards = {noBudget: () => true};
export const config = generateConfig(mockActions, guards);

export const confirmChannelCreationWorkflow = (
  _store: Store,
  messagingService: MessagingServiceInterface,
  context: WorkflowContext
): WorkflowMachine => {
  const actions = {
    // TODO: We should probably set up some standard actions for all workflows
    displayUi: () => {
      messagingService.sendDisplayMessage('Show');
    },
    hideUi: () => {
      messagingService.sendDisplayMessage('Hide');
    }
  };
  return Machine(config).withConfig({actions}, context) as WorkflowMachine;
};
// TODO: Once budgets are a thing this should check for a budget
// TODO: We shouldn't need to cast this but some xstate typing is not lining up around stateSchema

export type WorkflowMachine = StateMachine<WorkflowContext, StateSchema, WorkflowEvent, any>;
