import {
  ServiceConfig,
  StateMachine,
  Machine,
  ActionFunction,
  DoneInvokeEvent,
  assign,
  MachineConfig,
  Condition,
  AssignAction
} from 'xstate';
import {
  getDataAndInvoke,
  CommonWorkflowActions,
  commonWorkflowActions,
  CommonActions
} from '../utils';
import {SupportState} from '.';
import {Store} from '../store';
import {outcomesEqual} from '../store/state-utils';
import {Participant, Objective, CloseLedger} from '../store/types';
import {MessagingServiceInterface} from '../messaging';

import {ChannelChainInfo} from '../chain';
import {map, filter} from 'rxjs/operators';

interface Initial {
  requestId: number;
  opponent: Participant;
  player: Participant;
  site: string;
}
interface LedgerExists extends Initial {
  ledgerId: string;
}

interface Transaction {
  transactionId: string;
}
interface FundsWithdrawn {
  type: 'FUNDS_WITHDRAWN';
}

type WorkflowTypeState =
  | {value: 'waitForUserApproval'; context: Initial}
  | {value: 'createObjective'; context: LedgerExists}
  | {value: {closeLedger: 'constructFinalState'}; context: LedgerExists}
  | {value: {closeLedger: 'supportState'}; context: LedgerExists}
  | {value: {closeLedger: 'done'}; context: LedgerExists}
  | {value: {withdraw: 'submitTransaction'}; context: LedgerExists}
  | {value: {withdraw: 'waitMining'}; context: LedgerExists & Transaction}
  | {value: {withdraw: 'done'}; context: LedgerExists}
  | {value: 'done'; context: LedgerExists}
  | {value: 'clearBudget'; context: LedgerExists}
  | {value: 'budgetFailure'; context: Initial}
  | {value: 'userDeclinedFailure'; context: Initial};

export type WorkflowContext = WorkflowTypeState['context'];

type WorkflowEvent =
  | UserApproves
  | UserRejects
  | DoneInvokeEvent<CloseLedger>
  | DoneInvokeEvent<LedgerExists>
  | DoneInvokeEvent<string>
  | FundsWithdrawn;
interface UserApproves {
  type: 'USER_APPROVES_CLOSE';
}
interface UserRejects {
  type: 'USER_REJECTS_CLOSE';
}
enum Actions {
  sendResponse = 'sendResponse',
  assignLedgerId = 'assignLedgerId',
  setTransactionId = 'setTransactionId'
}

enum Services {
  constructFinalState = 'constructFinalState',
  supportState = 'supportState',
  submitWithdrawTransaction = 'submitWithdrawTransaction',
  createObjective = 'createObjective',
  observeFundsWithdrawal = 'observeFundsWithdrawal',
  clearBudget = 'clearBudget'
}

enum Guards {
  isBlockDeepEnough = 'isBlockDeepEnough'
}

export type WorkflowActions = CommonWorkflowActions &
  Record<
    Actions,
    ActionFunction<WorkflowContext, WorkflowEvent> | AssignAction<WorkflowContext, WorkflowEvent>
  >;
export type WorkflowServices = Record<Services, ServiceConfig<WorkflowContext>>;
export type WorkflowGuards = Record<Guards, Condition<WorkflowContext, WorkflowEvent>>;

export const config: MachineConfig<WorkflowContext, any, WorkflowEvent> = {
  id: 'close-and-withdraw',

  initial: 'waitForUserApproval',
  states: {
    waitForUserApproval: {
      entry: [CommonActions.displayUI],
      on: {
        USER_APPROVES_CLOSE: {target: 'createObjective'},
        USER_REJECTS_CLOSE: {target: 'userDeclinedFailure'}
      }
    },

    createObjective: {
      invoke: {
        src: Services.createObjective,
        onDone: {target: 'closeLedger', actions: [Actions.assignLedgerId]}
      }
    },
    closeLedger: getDataAndInvoke<LedgerExists>(
      {src: Services.constructFinalState},
      {src: Services.supportState},
      'withdraw'
    ) as any,
    withdraw: {
      invoke: {
        id: 'observeChain',
        src: Services.observeFundsWithdrawal
      },
      states: {
        submitTransaction: {
          invoke: {
            id: 'submitTransaction',
            src: Services.submitWithdrawTransaction,
            onDone: {
              target: 'waitMining',
              actions: [Actions.setTransactionId]
            }
          }
        },
        waitMining: {
          on: {
            BLOCK_UPDATED: [{target: 'done', cond: Guards.isBlockDeepEnough}]
          }
        },
        done: {type: 'final'}
      },
      onDone: 'clearBudget'
    },
    clearBudget: {
      invoke: {src: Services.clearBudget, onDone: 'done', onError: 'budgetFailure'}
    },
    done: {type: 'final', entry: [Actions.sendResponse, CommonActions.hideUI]},
    userDeclinedFailure: {
      type: 'final',
      entry: [CommonActions.hideUI, CommonActions.sendUserDeclinedErrorResponse]
    },
    budgetFailure: {
      type: 'final',
      entry: [CommonActions.hideUI] /* TODO Should we send a response?  */
    }
  }
};

const constructFinalState = (store: Store) => async ({opponent: hub}) => {
  const {latestSignedByMe: latestSupportedByMe, latest} = await store.getLedger(hub.participantId);

  // If we've received a new final state that matches our outcome we support that
  if (latest.isFinal && outcomesEqual(latestSupportedByMe.outcome, latest.outcome)) {
    return {state: latest};
  }
  // Otherwise send out our final state that we support
  if (latestSupportedByMe.isFinal) {
    return {state: latestSupportedByMe};
  }
  // Otherwise create a new final state
  return {
    state: {
      ...latestSupportedByMe,
      turnNum: latestSupportedByMe.turnNum.add(1),
      isFinal: true
    }
  };
};

const submitWithdrawTransaction = (store: Store) => async context => {
  // TODO: Should we just fetch this once and store on the context
  const ledgerEntry = await store.getLedger(context.opponent.participantId);
  if (!ledgerEntry.isFinalized) {
    throw new Error(`Channel ${ledgerEntry.channelId} is not finalized`);
  }
  await store.chain.finalizeAndWithdraw(ledgerEntry.support);
};

const createObjective = (store: Store) => async context => {
  const ledgerEntry = await store.getLedger(context.opponent.participantId);

  const objective: Objective = {
    type: 'CloseLedger',
    participants: [context.player, context.opponent],
    data: {ledgerId: ledgerEntry.channelId}
  };
  await store.addObjective(objective);
  return objective;
};
const observeFundsWithdrawal = (store: Store) => ({ledgerId}: LedgerExists) =>
  store.chain.chainUpdatedFeed(ledgerId).pipe(
    filter(c => c.amount.eq(0)),
    map<ChannelChainInfo, FundsWithdrawn>(c => ({type: 'FUNDS_WITHDRAWN'}))
  );

const clearBudget = (store: Store): ServiceConfig<Initial> => async context => {
  await store.clearBudget(context.site);
};
const options = (
  store: Store,
  messagingService: MessagingServiceInterface
): {services: WorkflowServices; actions: WorkflowActions} => ({
  services: {
    constructFinalState: constructFinalState(store),
    supportState: SupportState.machine(store),
    submitWithdrawTransaction: submitWithdrawTransaction(store),
    createObjective: createObjective(store),
    observeFundsWithdrawal: observeFundsWithdrawal(store),
    clearBudget: clearBudget(store)
  },
  actions: {
    ...commonWorkflowActions(messagingService),
    setTransactionId: assign({
      transactionId: (context, event: DoneInvokeEvent<string>) => event.data
    }),

    sendResponse: async context =>
      await messagingService.sendResponse(context.requestId, {success: true}),
    assignLedgerId: async (_, event: DoneInvokeEvent<CloseLedger>) =>
      assign({ledgerId: event.data.data.ledgerId})
  }
});
export const workflow = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context: WorkflowContext
): StateMachine<WorkflowContext, any, WorkflowEvent, WorkflowTypeState> =>
  Machine(config)
    .withConfig(options(store, messagingService))
    .withContext(context);
