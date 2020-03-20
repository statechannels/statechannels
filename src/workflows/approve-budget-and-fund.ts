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
import {
  SiteBudget,
  AllocationItem,
  Participant,
  AssetBudget,
  SimpleAllocation
} from '../store/types';
import {sendDisplayMessage, MessagingServiceInterface} from '../messaging';
import {Store} from '../store';
import {serializeSiteBudget} from '../serde/app-messages/serialize';

import {CreateAndFundLedger} from '../workflows';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {simpleEthAllocation} from '../utils/outcome';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {checkThat, exists} from '../utils';
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
  createAndFundLedger: (context: WorkflowContext, event: any) => StateMachine<any, any, any, any>;
}
export interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  states: {
    waitForUserApproval: {};
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
  sendBudgetUpdated: Action<WorkflowContext, any>;
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
        USER_APPROVES_BUDGET: {target: 'fundLedger', actions: []},
        USER_REJECTS_BUDGET: {target: 'failure'}
      }
    },
    fundLedger: {invoke: {src: 'createAndFundLedger', onDone: 'done'}},
    done: {
      type: 'final',
      entry: [
        actions.hideUi,
        actions.sendResponse,
        /* This might be overkill */ actions.sendBudgetUpdated
      ]
    },
    failure: {type: 'final'}
  }
});

const mockActions: WorkflowActions = {
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  sendResponse: 'sendResponse',
  sendBudgetUpdated: 'sendBudgetUpdated'
};

export const approveBudgetAndFundWorkflow = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context: WorkflowContext
): WorkflowMachine => {
  const services: WorkflowServices = {
    updateBudget: (context: WorkflowContext, event) => {
      return store.createBudget(context.budget);
    },
    createAndFundLedger: (context: WorkflowContext) => {
      return CreateAndFundLedger.createAndFundLedgerWorkflow(store, {
        initialOutcome: convertPendingBudgetToAllocation(context),
        participants: [context.player, context.hub]
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
    },
    sendBudgetUpdated: async (context: WorkflowContext, event) => {
      await messagingService.sendBudgetNotification(context.budget);
    },
    updateBudgetToFree: assign(
      ({budget}: WorkflowContext): WorkflowContext => {
        const {site, hubAddress} = budget;
        const clonedAssetBudgets = _.mapValues(context.budget.forAsset, freeAssetBudget);
        return {...context, budget: {site, hubAddress, forAsset: clonedAssetBudgets}};
      }
    )
  };
  const config = generateConfig(actions);
  return Machine(config).withConfig({services}, context) as WorkflowMachine;
};

export type WorkflowMachine = StateMachine<WorkflowContext, StateSchema, WorkflowEvent, any>;

// To keep consistent with the majority of other workflows
export type Init = WorkflowContext;
export const machine = approveBudgetAndFundWorkflow;

export const config = generateConfig(mockActions);

// TODO: Should there be a Site Budget class that handles this?
function freeAssetBudget(assetBudget: AssetBudget): AssetBudget {
  const {pending, inUse, direct, assetHolderAddress} = assetBudget;
  return {
    assetHolderAddress,
    inUse,
    direct,
    free: pending,
    pending: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)}
  };
}

function convertPendingBudgetToAllocation({
  hub,
  player,
  budget
}: WorkflowContext): SimpleAllocation {
  // TODO: Eventually we will need to support more complex budgets
  if (Object.keys(budget.forAsset).length !== 1) {
    throw new Error('Cannot handle mixed budget');
  }
  const ethBudget = checkThat<AssetBudget>(budget.forAsset[ETH_ASSET_HOLDER_ADDRESS], exists);
  const playerItem: AllocationItem = {
    destination: player.destination,
    amount: ethBudget.pending.playerAmount
  };
  const hubItem: AllocationItem = {
    destination: hub.destination,
    amount: ethBudget.pending.hubAmount
  };
  return simpleEthAllocation([hubItem, playerItem]);
}
