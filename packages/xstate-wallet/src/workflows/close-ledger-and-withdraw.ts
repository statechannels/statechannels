import {
  StateNodeConfig,
  ServiceConfig,
  StateMachine,
  Machine,
  AnyEventObject,
  ActionFunction,
  ActionFunctionMap
} from 'xstate';
import {getDataAndInvoke} from '../utils';
import {SupportState} from '.';
import {Store} from '../store';
import {outcomesEqual} from '../store/state-utils';
import {Participant, Objective} from '../store/types';
import {MessagingServiceInterface} from '../messaging';

type WorkflowEvent = AnyEventObject;
export type WorkflowContext = {
  requestId: number;
  hub: Participant;
  player: Participant;
};
interface WorkflowActions extends ActionFunctionMap<WorkflowContext, WorkflowEvent> {
  sendResponse: ActionFunction<WorkflowContext, WorkflowEvent>;
}
interface WorkflowServices extends Record<string, ServiceConfig<WorkflowContext>> {
  getFinalState: (context: WorkflowContext, event: WorkflowEvent) => Promise<SupportState.Init>;
  supportState: StateMachine<any, any, any>;
  submitWithdrawTransaction: (context: WorkflowContext, event: WorkflowEvent) => Promise<void>;
  createObjective: (context: WorkflowContext, event: any) => Promise<void>;
}

export const config: StateNodeConfig<WorkflowContext, any, any> = {
  initial: 'createObjective',
  states: {
    createObjective: {invoke: {src: 'createObjective', onDone: 'closeLedger'}},
    closeLedger: getDataAndInvoke({src: 'getFinalState'}, {src: 'supportState'}, 'withdraw'),
    withdraw: {
      invoke: {src: 'submitWithdrawTransaction', onDone: 'done', onError: 'failure'}
    },
    done: {type: 'final', entry: ['sendResponse']},
    failure: {type: 'final'}
  }
};

const getFinalState = (store: Store): WorkflowServices['getFinalState'] => async ({hub}) => {
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
  const ledgerEntry = await store.getLedger(context.hub.participantId);
  if (!ledgerEntry.isFinalized) {
    throw new Error(`Channel ${ledgerEntry.channelId} is not finalized`);
  }
  await store.chain.finalizeAndWithdraw(ledgerEntry.finalizationProof);
};

const createObjective = (store: Store): WorkflowServices['createObjective'] => async context => {
  const ledgerEntry = await store.getLedger(context.hub.participantId);
  if (!ledgerEntry.isFinalized) {
    throw new Error(`Channel ${ledgerEntry.channelId} is not finalized`);
  }
  const objective: Objective = {
    type: 'CloseLedger',
    participants: [context.player, context.hub],
    data: {ledgerId: ledgerEntry.channelId}
  };
  return store.addObjective(objective);
};

const options = (
  store: Store,
  messagingService: MessagingServiceInterface
): {services: WorkflowServices; actions: WorkflowActions} => {
  return {
    services: {
      getFinalState: getFinalState(store),
      supportState: SupportState.machine(store),
      submitWithdrawTransaction: submitWithdrawTransaction(store),
      createObjective: createObjective(store)
    },
    actions: {
      sendResponse: async context => await messagingService.sendResponse(context.requestId, {})
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
