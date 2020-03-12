// A workflow to guide the user through enabling window.ethereum

import {
  StateSchema,
  State,
  Action,
  MachineConfig,
  Machine,
  StateMachine,
  ServiceConfig,
  assign
} from 'xstate';
import {sendDisplayMessage, MessagingServiceInterface} from '../messaging';
import {Store} from '../store';

interface UserApproves {
  type: 'USER_APPROVES_ENABLE';
}
interface UserRejects {
  type: 'USER_REJECTS_ENABLE';
}
export type WorkflowEvent = UserApproves | UserRejects;

export interface WorkflowContext {
  requestId: number;
  enabledAddress?: string;
}

export interface WorkflowServices extends Record<string, ServiceConfig<WorkflowContext>> {
  enableEthereum: () => Promise<string>;
}
export interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  states: {
    explainToUser: {};
    enabling: {};
    done: {};
    failure: {};
  };
}
export type WorkflowState = State<WorkflowContext, WorkflowEvent, WorkflowStateSchema, any>;

export interface WorkflowActions {
  hideUi: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>; // calls directly to messaging service
  sendResponse: Action<WorkflowContext, any>; // calls directly to messaging service
}
export type StateValue = keyof WorkflowStateSchema['states'];

const generateConfig = (
  actions: WorkflowActions
): MachineConfig<WorkflowContext, WorkflowStateSchema, WorkflowEvent> => ({
  id: 'enable-ethereum',
  initial: 'explainToUser',
  states: {
    explainToUser: {
      entry: [actions.displayUi],
      on: {
        USER_APPROVES_ENABLE: {target: 'enabling'},
        USER_REJECTS_ENABLE: {target: 'failure'}
      }
    },
    enabling: {
      invoke: {
        src: 'enableEthereum',
        onDone: {target: 'done', actions: assign({enabledAddress: (context, event) => event.data})},
        onError: 'failure'
      }
    }, // invoke ethereum enable
    done: {type: 'final', entry: [actions.hideUi, actions.sendResponse]},
    failure: {type: 'final'}
  }
});

// This is all a bit horrible because we want to make it possible to both generate a nice
// picture and also generate code.

// And then there are services and actions and events and states

// protocol interface:
//   - methods you can call on the store / messaging service
//   - actions
//

// but if you want to build something complex out of these, you still need to give it a display name
// and then you need to mock these
export type WorkflowMachine = StateMachine<WorkflowContext, StateSchema, WorkflowEvent, any>;

export const ethereumEnableWorkflow = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context: WorkflowContext
): WorkflowMachine => {
  const services: WorkflowServices = {
    enableEthereum: () => store.chain.ethereumEnable()
  };
  const actions = {
    displayUi: () => {
      sendDisplayMessage('Show');
    },
    hideUi: () => {
      sendDisplayMessage('Hide');
    },
    sendResponse: (context: WorkflowContext, event) => {
      messagingService.sendResponse(context.requestId, context.enabledAddress as string); // todo: typing
    }
  };
  const config = generateConfig(actions);
  return Machine(config).withConfig({services}, context) as WorkflowMachine;
};

// Mock values for diagram generation
// ==================================

const mockActions: WorkflowActions = {
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  sendResponse: 'sendResponse'
};

export const mockServices: WorkflowServices = {
  enableEthereum: () => {
    return new Promise(() => {
      /* Mock call */
    }) as any;
  }
};
export const mockOptions = {services: mockServices, actions: mockActions};
export const config = generateConfig(mockActions);
