import {
  GuardPredicate,
  StateMachine,
  EventObject,
  MachineConfig,
  Machine,
  DoneInvokeEvent,
  StateNodeConfig,
  assign,
  ActionFunction,
  ActionObject,
  ActionFunctionMap
} from 'xstate';
import {Store} from '../store';
import {MessagingServiceInterface} from '../messaging';

export function createMockGuard(guardName: string): GuardPredicate<any, any> {
  return {
    name: guardName,
    predicate: () => true,
    type: 'xstate.guard'
  };
}

// TODO
// Some machine factories require a context, and some don't
// Sort this out.
export type MachineFactory<I, E extends EventObject> = (
  store: Store,
  context?: I
) => StateMachine<I, any, E>;

type Options = (store: Store) => any;
type Config<T> = MachineConfig<T, any, any>;
export const connectToStore: <T>(config: Config<T>, options: Options) => MachineFactory<T, any> = <
  T
>(
  config: Config<T>,
  options: Options
) => (store: Store, context?: T | undefined) => Machine(config).withConfig(options(store), context);

/*
Since machines typically  don't have sync access to a store, we invoke a promise to get the
desired outcome; that outcome can then be forwarded to the invoked service.
*/
export function getDataAndInvoke2<T>(
  data: string,
  src: string,
  onDone?: string,
  id?: string
): StateNodeConfig<any, any, any> {
  return {
    initial: data,
    states: {
      [data]: {invoke: {src: data, onDone: src}},
      [src]: {
        invoke: {
          id,
          src,
          data: (_, {data}: DoneInvokeEvent<T>) => data,
          onDone: 'done',
          autoForward: true
        }
      },
      done: {type: 'final' as 'final'}
    },
    onDone
  };
}

export const assignError = assign({
  error: (_, event: DoneInvokeEvent<Error>) => event.data.message
});

export const debugAction = (c, e, {state}) => {
  // eslint-disable-next-line no-debugger
  debugger;
};

export const displayUI = (messagingService: MessagingServiceInterface): ActionObject<any, any> => ({
  type: 'displayUI',
  exec: () => messagingService.sendDisplayMessage('Show')
});
export const hideUI = (messagingService: MessagingServiceInterface): ActionObject<any, any> => ({
  type: 'hideUI',
  exec: () => messagingService.sendDisplayMessage('Hide')
});

export const sendUserDeclinedResponse = (
  messageService: MessagingServiceInterface
): ActionFunction<any, any> => (context, _) => {
  if (!context.requestId) {
    throw new Error(`No request id in context ${JSON.stringify(context)}`);
  }
  messageService.sendError(context.requestId, {
    code: 200,
    message: 'User declined'
  });
};

export interface CommonWorkflowActions extends ActionFunctionMap<any, any> {
  sendUserDeclinedErrorResponse: ActionFunction<{requestId: number}, any>;
  hideUI: ActionObject<any, any>;
  displayUI: ActionObject<any, any>;
}
export const commonWorkflowActions = (
  messageService: MessagingServiceInterface
): CommonWorkflowActions => ({
  displayUI: displayUI(messageService),
  hideUI: hideUI(messageService),
  sendUserDeclinedErrorResponse: sendUserDeclinedResponse(messageService)
});
