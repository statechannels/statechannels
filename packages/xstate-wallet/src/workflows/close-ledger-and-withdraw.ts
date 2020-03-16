import {
  StateNodeConfig,
  ServiceConfig,
  StateMachine,
  Machine,
  AnyEventObject,
  ActionFunction,
  ActionFunctionMap,
  DoneInvokeEvent,
  assign,
  ConditionPredicate
} from 'xstate';
import {getDataAndInvoke} from '../utils';
import {SupportState} from '.';
import {Store} from '../store';
import {outcomesEqual} from '../store/state-utils';
import {Participant, Objective, CloseLedger} from '../store/types';
import {MessagingServiceInterface} from '../messaging';

type WorkflowEvent = AnyEventObject;
export type WorkflowContext = {
  requestId: number;
  opponent: Participant;
  player: Participant;
  ledgerId?: string;
};
type WorkflowGuards = {
  doesChannelIdExist: ConditionPredicate<WorkflowContext, WorkflowEvent>;
};
interface WorkflowActions extends ActionFunctionMap<WorkflowContext, WorkflowEvent> {
  sendResponse: ActionFunction<WorkflowContext, WorkflowEvent>;
  assignLedgerId: ActionFunction<WorkflowContext, DoneInvokeEvent<CloseLedger>>;
}
interface WorkflowServices extends Record<string, ServiceConfig<WorkflowContext>> {
  getFinalState: (context: WorkflowContext, event: WorkflowEvent) => Promise<SupportState.Init>;
  supportState: StateMachine<any, any, any>;
  submitWithdrawTransaction: (context: WorkflowContext, event: WorkflowEvent) => Promise<void>;
  createObjective: (context: WorkflowContext, event: any) => Promise<Objective>;
}

export const config: StateNodeConfig<WorkflowContext, any, any> = {
  initial: 'doesLedgerIdExist',
  states: {
    doesLedgerIdExist: {
      on: {'': [{cond: 'doesChannelIdExist', target: 'closeLedger'}, 'createObjective']}
    },
    createObjective: {
      invoke: {
        src: 'createObjective',
        onDone: {target: 'closeLedger', actions: ['assignLedgerId']}
      }
    },
    closeLedger: getDataAndInvoke({src: 'getFinalState'}, {src: 'supportState'}, 'withdraw'),
    withdraw: {
      invoke: {src: 'submitWithdrawTransaction', onDone: 'done', onError: 'failure'}
    },
    done: {type: 'final', entry: ['sendResponse']},
    failure: {type: 'final'}
  }
};

const getFinalState = (store: Store): WorkflowServices['getFinalState'] => async ({
  opponent: hub
}) => {
  const {latestSupportedByMe, latest} = await store.getLedger(hub.participantId);

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

const options = (
  store: Store,
  messagingService: MessagingServiceInterface
): {services: WorkflowServices; actions: WorkflowActions; guards: WorkflowGuards} => {
  return {
    services: {
      getFinalState: getFinalState(store),
      supportState: SupportState.machine(store),
      submitWithdrawTransaction: submitWithdrawTransaction(store),
      createObjective: createObjective(store)
    },
    actions: {
      sendResponse: async context =>
        await messagingService.sendResponse(context.requestId, {success: true}),
      assignLedgerId: async (_, event) => assign({ledgerId: event.data.data.ledgerId})
    },
    guards: {
      doesChannelIdExist: context => !!context.ledgerId
    }
  };
};
export const workflow = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context: WorkflowContext
) =>
  Machine(config)
    .withConfig(options(store, messagingService))
    .withContext(context);
