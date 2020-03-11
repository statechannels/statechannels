import {
  StateSchema,
  State,
  Action,
  MachineConfig,
  Machine,
  StateMachine,
  ServiceConfig
} from 'xstate';
import {SiteBudget, AllocationItem, Participant} from '../store/types';
import {sendDisplayMessage, MessagingServiceInterface} from '../messaging';
import {Store} from '../store';
import {serializeSiteBudget} from '../serde/app-messages/serialize';

import * as CreateAndFundLedger from '../workflows/create-and-fund-ledger';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {simpleEthAllocation} from '../utils/outcome';
interface UserApproves {
  type: 'USER_APPROVES_BUDGET';
}
interface UserRejects {
  type: 'USER_REJECTS_BUDGET';
}
export type WorkflowEvent = UserApproves | UserRejects;

export interface WorkflowContext {
  budget: SiteBudget;
  player: Participant;
  hub: Participant;
  requestId: number;
}

export interface WorkflowServices extends Record<string, ServiceConfig<WorkflowContext>> {
  updateBudget: (context: WorkflowContext, event: any) => Promise<void>;
  createAndFundLedger: (context: WorkflowContext, event: any) => StateMachine<any, any, any, any>;
}
export interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  states: {
    waitForUserApproval: {};
    updateBudgetInStore: {};
    fundLedger: {};
    done: {};
    failure: {};
  };
}
export type WorkflowState = State<WorkflowContext, WorkflowEvent, WorkflowStateSchema, any>;

export interface WorkflowActions {
  hideUi: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>;
  sendResponse: Action<WorkflowContext, any>;
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
        USER_APPROVES_BUDGET: {target: 'updateBudgetInStore', actions: []},
        USER_REJECTS_BUDGET: {target: 'failure'}
      }
    },
    updateBudgetInStore: {invoke: {src: 'updateBudget', onDone: 'fundLedger'}},
    fundLedger: {invoke: {src: 'createAndFundLedger', onDone: 'done'}},
    done: {type: 'final', entry: [actions.hideUi, actions.sendResponse]},
    failure: {type: 'final'}
  }
});

const mockActions: WorkflowActions = {
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  sendResponse: 'sendResponse'
};

export const approveBudgetAndFundWorkflow = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context: WorkflowContext
): WorkflowMachine => {
  const services: WorkflowServices = {
    updateBudget: (context: WorkflowContext, event) => {
      return store.updateOrCreateBudget(context.budget);
    },
    createAndFundLedger: ({player, hub, budget}: WorkflowContext) => {
      // TODO: Abstract into function that takes a budget and returns a outcome
      const ethBudget = budget.budgets[ETH_ASSET_HOLDER_ADDRESS];
      const playerItem: AllocationItem = {
        destination: player.destination,
        amount: ethBudget.free.playerAmount
      };
      const hubItem: AllocationItem = {
        destination: player.destination,
        amount: ethBudget.free.playerAmount
      };

      return CreateAndFundLedger.createAndFundLedgerWorkflow(store, {
        initialOutcome: simpleEthAllocation([playerItem, hubItem]),
        participants: [player, hub]
      });
    }
  };
  const actions = {
    // TODO: We should probably set up some standard actions for all workflows
    displayUi: () => {
      sendDisplayMessage('Show');
    },
    hideUi: () => {
      sendDisplayMessage('Hide');
    },
    sendResponse: (context: WorkflowContext, event) => {
      messagingService.sendResponse(context.requestId, serializeSiteBudget(context.budget));
    }
  };
  const config = generateConfig(actions);
  return Machine(config).withConfig({services}, context) as WorkflowMachine;
};

export type WorkflowMachine = StateMachine<WorkflowContext, StateSchema, WorkflowEvent, any>;

export const config = generateConfig(mockActions);
