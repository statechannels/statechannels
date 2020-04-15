import {
  ServiceConfig,
  StateMachine,
  Machine,
  ActionFunction,
  DoneInvokeEvent,
  assign,
  MachineConfig
} from 'xstate';
import {getDataAndInvoke, CommonWorkflowActions, commonWorkflowActions} from '../utils';
import {SupportState} from '.';
import {Store} from '../store';
import {outcomesEqual} from '../store/state-utils';
import {Participant, Objective, CloseLedger} from '../store/types';
import {MessagingServiceInterface} from '../messaging';
import {BigNumber} from 'ethers/utils';
interface Initial {
  requestId: number;
  opponent: Participant;
  player: Participant;
  site: string;
}
interface LedgerExists extends Initial {
  ledgerId: string;
}
interface Chain {
  ledgerTotal: BigNumber;
  lastChangeBlockNum: BigNumber;
  currentBlockNum: BigNumber;
}

interface Transaction {
  transactionId: string;
}

type WorkflowTypeState =
  | {value: 'waitForUserApproval'; context: Initial}
  | {value: 'createObjective'; context: LedgerExists}
  | {value: 'closeLedger'; context: LedgerExists}
  | {value: {withdraw: 'init'}; context: LedgerExists}
  | {value: {deposit: 'submitTransaction'}; context: LedgerExists & Chain}
  | {value: {deposit: 'retry'}; context: LedgerExists & Chain}
  | {value: {deposit: 'waitMining'}; context: LedgerExists & Chain & Transaction}
  | {value: 'done'; context: LedgerExists}
  | {value: 'failure'; context: Initial};

type WorkflowContext = WorkflowTypeState['context'];

type WorkflowEvent = UserApproves | UserRejects | DoneInvokeEvent<CloseLedger>;
interface UserApproves {
  type: 'USER_APPROVES_CLOSE';
}
interface UserRejects {
  type: 'USER_REJECTS_CLOSE';
}
enum Actions {
  sendResponse = 'sendResponse',
  assignLedgerId = 'assignLedgerId',
  clearBudget = 'clearBudget'
}

export type WorkflowActions = CommonWorkflowActions &
  Record<Actions, ActionFunction<WorkflowContext, WorkflowEvent>>;
interface WorkflowServices extends Record<string, ServiceConfig<WorkflowContext>> {
  constructFinalState: (
    context: WorkflowContext,
    event: WorkflowEvent
  ) => Promise<SupportState.Init>;
  supportState: StateMachine<any, any, any>;
  submitWithdrawTransaction: (context: WorkflowContext, event: WorkflowEvent) => Promise<void>;
  createObjective: (context: WorkflowContext, event: any) => Promise<Objective>;
}

const config: MachineConfig<WorkflowContext, any, WorkflowEvent> = {
  id: 'close-and-withdraw',

  initial: 'waitForUserApproval',
  states: {
    waitForUserApproval: {
      entry: ['displayUi'],
      on: {
        USER_APPROVES_CLOSE: {target: 'createObjective'},
        USER_REJECTS_CLOSE: {target: 'userDeclinedFailure'}
      }
    },

    createObjective: {
      invoke: {
        src: 'createObjective',
        onDone: {target: 'closeLedger', actions: ['assignLedgerId']}
      }
    },
    closeLedger: getDataAndInvoke<any>(
      {src: 'constructFinalState'},
      {src: 'supportState'},
      'withdraw'
    ),
    withdraw: {
      invoke: {
        id: 'observeChain',
        src: 'observeLedgerOnChainBalance(store)'
      },
      states: {
        submitTransaction: {
          invoke: {
            id: 'submitTransaction',
            src: 'submitWithdrawalTransaction',
            onDone: {target: 'waitMining', actions: 'setTransactionId'}
          }
        },
        waitMining: {},
        done: {type: 'final'}
      },
      onDone: 'clearBudget'
    },
    clearBudget: {invoke: {src: 'clearBudget', onDone: 'done', onError: 'budgetFailure'}},
    done: {type: 'final', entry: ['sendResponse', 'hideUi']},
    userDeclinedFailure: {type: 'final', entry: ['sendUserDeclinedErrorResponse', 'hideUI']},
    budgetFailure: {type: 'final', entry: ['hideUi'] /* TODO Should we send a response?  */}
  }
};

const constructFinalState = (store: Store): WorkflowServices['constructFinalState'] => async ({
  opponent: hub
}) => {
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

const submitWithdrawTransaction = (
  store: Store
): WorkflowServices['submitWithdrawTransaction'] => async context => {
  // TODO: Should we just fetch this once and store on the context
  const ledgerEntry = await store.getLedger(context.opponent.participantId);
  if (!ledgerEntry.isFinalized) {
    throw new Error(`Channel ${ledgerEntry.channelId} is not finalized`);
  }
  await store.chain.finalizeAndWithdraw(ledgerEntry.support);
};

const createObjective = (store: Store): WorkflowServices['createObjective'] => async context => {
  const ledgerEntry = await store.getLedger(context.opponent.participantId);

  const objective: Objective = {
    type: 'CloseLedger',
    participants: [context.player, context.opponent],
    data: {ledgerId: ledgerEntry.channelId}
  };
  await store.addObjective(objective);
  return objective;
};

const clearBudget = (store: Store): ActionFunction<WorkflowContext, any> => async context => {
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
    createObjective: createObjective(store)
  },
  actions: {
    ...commonWorkflowActions(messagingService),
    clearBudget: clearBudget(store),

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
) =>
  Machine(config)
    .withConfig(options(store, messagingService))
    .withContext(context);
