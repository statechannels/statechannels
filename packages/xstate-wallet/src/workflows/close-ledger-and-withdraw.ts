import {
  ServiceConfig,
  StateMachine,
  Machine,
  ActionFunction,
  DoneInvokeEvent,
  assign,
  MachineConfig,
  AssignAction,
  Interpreter
} from 'xstate';
import {getDataAndInvoke} from '@statechannels/wallet-core/lib/src/utils';
import {Store, DomainBudget} from '@statechannels/wallet-core/lib/src/store';
import {outcomesEqual} from '@statechannels/wallet-core/lib/src/store/state-utils';
import {Participant, Objective, CloseLedger} from '@statechannels/wallet-core/lib/src/store/types';

import {ChannelChainInfo} from '@statechannels/wallet-core/lib/src/chain';
import {map, filter} from 'rxjs/operators';
import {MessagingServiceInterface} from '../messaging';
import {SupportState} from '.';
import {CommonWorkflowActions, commonWorkflowActions, CommonActions} from '../utils/workflow-utils';

interface Initial {
  requestId: number;
  opponent: Participant;
  player: Participant;
  domain: string;
}
interface BudgetExists extends Initial {
  budget: DomainBudget;
}
interface LedgerExists extends BudgetExists {
  ledgerId: string;
}

interface Transaction {
  transactionId: string;
}
interface FundsWithdrawn {
  type: 'FUNDS_WITHDRAWN';
}

type WorkflowTypeState =
  | {value: 'fetchBudget'; context: Initial}
  | {value: 'waitForUserApproval'; context: BudgetExists}
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

export type WorkflowEvent =
  | UserApproves
  | UserRejects
  | DoneInvokeEvent<CloseLedger>
  | DoneInvokeEvent<LedgerExists>
  | DoneInvokeEvent<DomainBudget>
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
  setTransactionId = 'setTransactionId',
  assignBudget = 'assignBudget'
}

enum Services {
  constructFinalState = 'constructFinalState',
  supportState = 'supportState',
  submitWithdrawTransaction = 'submitWithdrawTransaction',
  createObjective = 'createObjective',
  observeFundsWithdrawal = 'observeFundsWithdrawal',
  fetchBudget = 'fetchBudget',
  clearBudget = 'clearBudget'
}

export type WorkflowActions = CommonWorkflowActions &
  Record<
    Actions,
    ActionFunction<WorkflowContext, WorkflowEvent> | AssignAction<WorkflowContext, WorkflowEvent>
  >;
export type WorkflowServices = Record<Services, ServiceConfig<WorkflowContext>>;

export const config: MachineConfig<WorkflowContext, any, WorkflowEvent> = {
  id: 'close-and-withdraw',

  initial: 'fetchBudget',
  states: {
    fetchBudget: {
      invoke: {
        src: Services.fetchBudget,
        onDone: {target: 'waitForUserApproval', actions: [Actions.assignBudget]}
      }
    },
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
      initial: 'submitTransaction',
      on: {
        FUNDS_WITHDRAWN: 'clearBudget'
      },
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
        waitMining: {}
      }
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
  if (!ledgerEntry.hasConclusionProof) {
    throw new Error(`Channel ${ledgerEntry.channelId} is not finalized`);
  }
  return store.chain.finalizeAndWithdraw(ledgerEntry.support);
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
    map<ChannelChainInfo, FundsWithdrawn>(() => ({type: 'FUNDS_WITHDRAWN'}))
  );

const clearBudget = (store: Store): ServiceConfig<Initial> => async context => {
  await store.clearBudget(context.domain);
};

const fetchBudget = (store: Store): ServiceConfig<Initial> => async context =>
  store.getBudget(context.domain);

const assignBudget = (): AssignAction<Initial, DoneInvokeEvent<DomainBudget>> =>
  assign((context, event) => ({
    ...context,
    budget: event.data
  }));

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
    clearBudget: clearBudget(store),
    fetchBudget: fetchBudget(store)
  },
  actions: {
    ...commonWorkflowActions(messagingService),
    assignBudget: assignBudget(),
    setTransactionId: assign({
      transactionId: (context, event: DoneInvokeEvent<string>) => event.data
    }),

    sendResponse: async context =>
      await messagingService.sendResponse(context.requestId, {success: true}),

    assignLedgerId: assign((context: Initial, event: DoneInvokeEvent<CloseLedger>) => ({
      ...context,
      ledgerId: event.data.data.ledgerId
    }))
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

export type CloseLedgerAndWithdrawService = Interpreter<
  WorkflowContext,
  any,
  WorkflowEvent,
  WorkflowTypeState
>;
