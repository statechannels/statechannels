import {
  GuardPredicate,
  StateMachine,
  EventObject,
  MachineConfig,
  Machine,
  DoneInvokeEvent,
  StateNodeConfig
} from 'xstate';
import {Store} from '../store';
import {createAllocationOutcomeFromParams} from './json-rpc-utils';
import {
  CreateChannelRequest,
  JoinChannelRequest,
  UpdateChannelRequest
} from '@statechannels/client-api-schema';
import {NETWORK_ID, CHALLENGE_DURATION} from '../constants';
import {OpenEvent, PlayerStateUpdate} from '../workflows/application';
import {toHex} from './hex-number-utils';

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
) => (store: Store, context?: T | undefined) => {
  return Machine(config).withConfig(options(store), context);
};

/*
Since machines typically  don't have sync access to a store, we invoke a promise to get the
desired outcome; that outcome can then be forwarded to the invoked service.
*/
export function getDataAndInvoke<T>(
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

export function convertToPlayerStateUpdateEvent(request: UpdateChannelRequest): PlayerStateUpdate {
  return {
    type: 'PLAYER_STATE_UPDATE',

    outcome: createAllocationOutcomeFromParams(request.params.allocations),
    channelId: request.params.channelId,
    appData: request.params.appData
  };
}

export function convertToOpenEvent(request: CreateChannelRequest | JoinChannelRequest): OpenEvent {
  if (request.method === 'CreateChannel') {
    return {
      type: 'CREATE_CHANNEL',
      ...request.params,
      outcome: createAllocationOutcomeFromParams(request.params.allocations),
      challengeDuration: toHex(CHALLENGE_DURATION),
      chainId: NETWORK_ID,
      requestId: request.id
    };
  } else {
    return {type: 'JOIN_CHANNEL', ...request.params, requestId: request.id};
  }
}
