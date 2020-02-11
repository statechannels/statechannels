import {
  MachineConfig,
  Machine,
  assign,
  Action,
  AssignAction,
  spawn,
  Condition,
  DoneInvokeEvent,
  StateSchema,
  ServiceConfig,
  StateMachine
} from 'xstate';
import {
  FINAL,
  ConcludeChannel,
  ObsoleteStore,
  SendStates,
  ChannelUpdated,
  ChannelStoreEntry,
  CreateAndDirectFund,
  unreachable
} from '@statechannels/wallet-protocols';

import {State, getChannelId} from '@statechannels/nitro-protocol';

import {sendDisplayMessage, dispatchChannelUpdatedMessage, observeRequests} from '../messaging';
import {map} from 'rxjs/operators';
import * as CCC from './confirm-create-channel';
import {JoinChannelParams, Participant, TokenAllocations} from '@statechannels/client-api-schema';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {createMockGuard} from '../utils/workflow-utils';
import {getEthAllocation, ethAllocationOutcome} from '../utils/allocation-utils';

interface WorkflowContext {
  channelId?: string;
  observer?: any;
  channelParams?: Omit<CreateChannelEvent, 'type'>;
}
type ChannelParamsExist = WorkflowContext & {channelParams: CCC.WorkflowContext};
type ChannelIdExists = WorkflowContext & {channelId: string};

interface WorkflowGuards {
  channelOpen: Condition<WorkflowContext, WorkflowEvent>;
  channelClosing: Condition<WorkflowContext, WorkflowEvent>;
  channelClosed: Condition<WorkflowContext, WorkflowEvent>;
}

interface WorkflowActions {
  sendToOpponent: Action<WorkflowContext, PlayerStateUpdate>;
  assignChannelId: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>;
  hideUi: Action<WorkflowContext, any>;
  sendChannelUpdatedNotification: Action<WorkflowContext, any>;
  spawnObserver: AssignAction<ChannelIdExists, any>;
}

export interface OpenChannelEvent {
  type: 'OPEN_CHANNEL';
  channelId: string;
}
// Events
type OpenEvent = CreateChannelEvent | OpenChannelEvent;

export interface CreateChannelEvent {
  type: 'CREATE_CHANNEL';
  participants: Participant[];
  allocations: TokenAllocations;
  appDefinition: string;
  appData: string;
  challengeDuration: number;
  chainId: string;
}

interface JoinChannelEvent {
  type: 'JoinChannel';
  params: JoinChannelParams;
}
interface PlayerStateUpdate {
  type: 'PLAYER_STATE_UPDATE';
  state: State;
}
interface PlayerRequestConclude {
  type: 'PLAYER_REQUEST_CONCLUDE';
  channelId: string;
}
type WorkflowEvent =
  | PlayerRequestConclude
  | PlayerStateUpdate
  | SendStates
  | OpenEvent
  | ChannelUpdated
  | JoinChannelEvent
  | DoneInvokeEvent<string>;

export type ApplicationWorkflowEvent = WorkflowEvent;

// TODO: Is this all that useful?
export interface WorkflowServices extends Record<string, ServiceConfig<WorkflowContext>> {
  createChannel: (context: WorkflowContext, event: WorkflowEvent) => Promise<void>;
  invokeClosingProtocol: (
    context: ChannelIdExists
  ) => StateMachine<ConcludeChannel.Init, any, any, any>;

  invokeCreateChannelAndDirectFundProtocol: (
    context: ChannelIdExists & ChannelParamsExist
  ) => StateMachine<any, any, any, any>;
  invokeCreateChannelConfirmation: (
    context: ChannelParamsExist,
    event: CreateChannelEvent | JoinChannelEvent
  ) => CCC.WorkflowMachine;
}
interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  states: {
    initializing: {};
    confirmCreateChannelWorkflow: {};
    waitForJoin: {};
    confirmJoinChannelWorkflow: {};
    openChannelAndDirectFundProtocol: {};
    createChannelInStore: {};
    running: {};
    closing: {};
    // TODO: Is it possible to type these as type:'final' ?
    done: {};
  };
}

const generateConfig = (
  actions,
  guards: WorkflowGuards
): MachineConfig<WorkflowContext, WorkflowStateSchema, WorkflowEvent> => ({
  id: 'application-workflow',
  initial: 'initializing',
  on: {CHANNEL_UPDATED: {actions: [actions.sendChannelUpdatedNotification]}},
  states: {
    initializing: {
      on: {
        CREATE_CHANNEL: 'confirmCreateChannelWorkflow',
        OPEN_CHANNEL: {target: 'waitForJoin', actions: [actions.assignChannelId]}
      }
    },
    waitForJoin: {
      on: {
        JoinChannel: {target: 'confirmJoinChannelWorkflow'}
      }
    },
    confirmCreateChannelWorkflow: {
      invoke: {
        src: 'invokeCreateChannelConfirmation',
        onDone: {
          target: 'createChannelInStore'
        }
      }
    },
    confirmJoinChannelWorkflow: {
      invoke: {
        src: 'invokeCreateChannelConfirmation',
        onDone: {
          target: 'openChannelAndDirectFundProtocol',
          actions: [actions.assignChannelId, actions.spawnObserver]
        }
      }
    },
    createChannelInStore: {
      invoke: {
        data: (context, event) => event.data,
        src: 'createChannel',
        onDone: {
          target: 'openChannelAndDirectFundProtocol',
          actions: [actions.assignChannelId, actions.spawnObserver]
        }
      }
    },

    openChannelAndDirectFundProtocol: {
      invoke: {
        src: 'invokeCreateChannelAndDirectFundProtocol',
        onDone: {
          target: 'running'
        }
      }
    },
    running: {
      on: {
        PLAYER_STATE_UPDATE: {target: 'running', actions: [actions.sendToOpponent]},
        CHANNEL_UPDATED: [
          {
            cond: guards.channelClosing,
            target: 'closing'
          }
        ],

        PLAYER_REQUEST_CONCLUDE: {target: 'closing'}
      }
    },
    //This could handled by another workflow instead of the application workflow
    closing: {
      entry: actions.displayUi,
      exit: actions.hideUi,
      invoke: {
        id: 'closing-protocol',
        src: 'invokeClosingProtocol',
        data: context => context,
        autoForward: true
      },
      on: {
        CHANNEL_UPDATED: [
          {
            cond: guards.channelClosed,
            target: 'done'
          },
          'closing'
        ]
      }
    },
    done: {type: FINAL}
  }
});

export const applicationWorkflow = (store: ObsoleteStore, context?: WorkflowContext) => {
  const notifyOnChannelMessage = ({channelId}: ChannelIdExists) => {
    return observeRequests(channelId).pipe(
      map(params => {
        params;
      })
    );
  };

  const actions: WorkflowActions = {
    spawnObserver: assign<ChannelIdExists>(context => ({
      ...context,
      // TODO: Do protocols register themselves against the store for state updates? Or do we need to handle them
      observer: spawn(notifyOnChannelMessage(context))
    })),

    sendToOpponent: (context, event) => {
      store.sendState(event.state);
    },
    sendChannelUpdatedNotification: (context, event) => {
      const entry = store.getEntry(event.channelId);
      // TODO: We should filter by context.channelId but that is not being set currently
      dispatchChannelUpdatedMessage(event.channelId, new ChannelStoreEntry(entry));
    },
    displayUi: () => {
      sendDisplayMessage('Show');
    },
    hideUi: () => {
      sendDisplayMessage('Hide');
    },
    assignChannelId: assign((context, event) => {
      if (!context.channelId) {
        if (event.type === 'PLAYER_STATE_UPDATE') {
          return {channelId: getChannelId(event.state.channel)};
        } else if (event.type === 'OPEN_CHANNEL') {
          return {channelId: event.channelId};
        } else if (event.type === 'done.invoke.createChannel') {
          return {channelId: event.data};
        }
        return {};
      }
      return {};
    })
  };

  const guards: WorkflowGuards = {
    channelOpen: (context: ChannelIdExists, event: ChannelUpdated): boolean => {
      const channelStoreEntry = new ChannelStoreEntry(event.entry);
      return !channelStoreEntry.latestState.isFinal;
    },
    channelClosing: (context: ChannelIdExists, event: ChannelUpdated): boolean => {
      const channelStoreEntry = new ChannelStoreEntry(event.entry);
      return channelStoreEntry.latestState.isFinal;
    },

    channelClosed: (context: ChannelIdExists, event: ChannelUpdated): boolean => {
      const channelStoreEntry = new ChannelStoreEntry(event.entry);
      return channelStoreEntry.hasSupportedState && channelStoreEntry.latestSupportedState.isFinal;
    }
  };

  const services: WorkflowServices = {
    createChannel: () => {
      // TODO: call createChannel on Store
      return new Promise(() => {
        /* TODO: This must start the protocol and sync it to the store if necessary */
      });
    },
    invokeClosingProtocol: (context: ChannelIdExists) => {
      return ConcludeChannel.machine(store, {channelId: context.channelId});
    },
    invokeCreateChannelAndDirectFundProtocol: (context: ChannelParamsExist & ChannelIdExists) => {
      const ourIndex = 0; // TODO:  get from store?
      return CreateAndDirectFund.machine(store, {
        ...context.channelParams,
        // TODO: We should never have a context without this
        // Right now this is left in for a test
        allocations: context?.channelParams?.allocations
          ? ethAllocationOutcome(context.channelParams.allocations, ETH_ASSET_HOLDER_ADDRESS)
          : [],
        channelId: context.channelId,
        index: ourIndex
      });
    },
    invokeCreateChannelConfirmation: (
      context: WorkflowContext,
      event: CreateChannelEvent | JoinChannelEvent
    ) => {
      switch (event.type) {
        case 'CREATE_CHANNEL':
          return CCC.confirmChannelCreationWorkflow(store, event);
        case 'JoinChannel':
          const entry = store.getEntry(event.params.channelId);
          // TODO: Standardize on how/where we handle conversion from json-rpc allocations to outcomes
          const {outcome, appData, appDefinition, channel, challengeDuration} = entry.latestState;

          const context = {
            allocations: getEthAllocation(outcome, ETH_ASSET_HOLDER_ADDRESS),
            appData,
            appDefinition,
            challengeDuration,
            chainId: channel.chainId,
            participants: entry.participants
          };
          return CCC.confirmChannelCreationWorkflow(store, context);
        default:
          return unreachable(event);
      }
    }
  };

  const config = generateConfig(actions, guards);
  return Machine(config).withConfig({services}, context || {});
};

const mockServices: WorkflowServices = {
  createChannel: () => {
    return new Promise(() => {
      /* Mock call */
    }) as any;
  },
  invokeClosingProtocol: () => {
    return new Promise(() => {
      /* Mock call */
    }) as any;
  },
  invokeCreateChannelAndDirectFundProtocol: context => {
    return new Promise(() => {
      /* mock*/
    }) as any;
  },
  invokeCreateChannelConfirmation: () => {
    return new Promise(() => {
      /* Mock call */
    }) as any;
  }
};
const mockActions: WorkflowActions = {
  sendToOpponent: 'sendToOpponent',
  sendChannelUpdatedNotification: 'sendChannelUpdatedNotification',
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  assignChannelId: 'assignChannelId',
  spawnObserver: 'spawnObserver' as any
};
const mockGuards: WorkflowGuards = {
  channelOpen: createMockGuard('channelOpen'),
  channelClosing: createMockGuard('channelClosing'),
  channelClosed: createMockGuard('channelClosed')
};
export const config = generateConfig(mockActions, mockGuards);
export const mockOptions = {services: mockServices, actions: mockActions, guards: mockGuards};
