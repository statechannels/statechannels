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
  StateMachine,
  StateNodeConfig
} from 'xstate';
import {FINAL, ConcludeChannel, SendStates, unreachable} from '@statechannels/wallet-protocols';

import {getChannelId} from '@statechannels/nitro-protocol';
import * as CreateAndDirectFund from './create-and-direct-fund';
import {sendDisplayMessage, dispatchChannelUpdatedMessage, observeRequests} from '../messaging';
import {map} from 'rxjs/operators';
import * as CCC from './confirm-create-channel';
import {JoinChannelParams, Participant} from '@statechannels/client-api-schema';
import {createMockGuard, getDataAndInvoke} from '../utils/workflow-utils';
import {Store} from '../store/memory-store';
import {StateVariables, SimpleEthAllocation} from '../store/types';
import {ChannelStoreEntry} from '../store/memory-channel-storage';
import {bigNumberify, BigNumber} from 'ethers/utils';

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
  outcome: SimpleEthAllocation;
  appDefinition: string;
  appData: string;
  challengeDuration: BigNumber;
  chainId: string;
}

export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  storeEntry: ChannelStoreEntry;
}

interface JoinChannelEvent {
  type: 'JoinChannel';
  params: JoinChannelParams;
}
interface PlayerStateUpdate {
  type: 'PLAYER_STATE_UPDATE';
  state: StateVariables;
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
  createChannel: (context: WorkflowContext, event: WorkflowEvent) => Promise<string>;
  invokeClosingProtocol: (
    context: ChannelIdExists
  ) => StateMachine<ConcludeChannel.Init, any, any, any>;

  invokeCreateChannelAndDirectFundProtocol: (
    context: ChannelIdExists & ChannelParamsExist
  ) => StateMachine<any, any, any, any>;
  invokeCreateChannelConfirmation: (
    context: ChannelParamsExist,
    event: DoneInvokeEvent<CCC.WorkflowContext>
  ) => CCC.WorkflowMachine;
  getDataForCreateChannelConfirmation: (
    context: WorkflowContext,
    event: CreateChannelEvent | JoinChannelEvent
  ) => Promise<CCC.WorkflowContext>;
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
    confirmCreateChannelWorkflow: getDataAndInvoke(
      'getDataForCreateChannelConfirmation',
      'invokeCreateChannelConfirmation',
      'createChannelInStore'
    ),
    confirmJoinChannelWorkflow: {
      ...(getDataAndInvoke(
        'getDataForCreateChannelConfirmation',
        'invokeCreateChannelConfirmation'
      ) as StateNodeConfig<WorkflowContext, {}, WorkflowEvent>),
      onDone: {
        target: 'openChannelAndDirectFundProtocol',
        actions: [actions.assignChannelId, actions.spawnObserver]
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

export const applicationWorkflow = (store: Store, context?: WorkflowContext) => {
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

    sendToOpponent: (context: ChannelIdExists, event) => {
      store.addState(context.channelId, event.state);
    },
    sendChannelUpdatedNotification: (
      context: ChannelIdExists,
      event: {storeEntry: ChannelStoreEntry}
    ) => {
      if (event.storeEntry.channelId === context.channelId) {
        dispatchChannelUpdatedMessage(event.storeEntry);
      }
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
      return !event.storeEntry.latestSupportedByMe?.isFinal;
    },
    channelClosing: (context: ChannelIdExists, event: ChannelUpdated): boolean => {
      return event.storeEntry.latestSupportedByMe?.isFinal || false;
    },

    channelClosed: (context: ChannelIdExists, event: ChannelUpdated): boolean => {
      return event.storeEntry.supported?.isFinal || false;
    }
  };

  const services: WorkflowServices = {
    createChannel: (context: ChannelParamsExist) => {
      const {
        participants,
        challengeDuration,
        outcome,
        appData,
        appDefinition
      } = context.channelParams;
      const stateVars: StateVariables = {
        outcome,
        appData,
        turnNum: bigNumberify(0),
        isFinal: false
      };
      return store.createChannel(
        participants,
        bigNumberify(challengeDuration),
        stateVars,
        appDefinition
      );
    },
    invokeClosingProtocol: (context: ChannelIdExists) => {
      // TODO: Close machine needs to accept new store
      return ConcludeChannel.machine(store as any, {channelId: context.channelId});
    },
    invokeCreateChannelAndDirectFundProtocol: (context: ChannelParamsExist & ChannelIdExists) => {
      const ourIndex = 0; // TODO:  get from store?
      return CreateAndDirectFund.machine(store, {
        ...context.channelParams,
        channelId: context.channelId,
        index: ourIndex
      });
    },
    invokeCreateChannelConfirmation: (context, event: DoneInvokeEvent<CCC.WorkflowContext>) =>
      CCC.confirmChannelCreationWorkflow(store, event.data),
    getDataForCreateChannelConfirmation: async (
      context: WorkflowContext,
      event: CreateChannelEvent | JoinChannelEvent
    ): Promise<CCC.WorkflowContext> => {
      switch (event.type) {
        case 'CREATE_CHANNEL':
          return event;
        case 'JoinChannel':
          const entry = await store.getEntry(event.params.channelId);
          return {
            ...entry.latest,
            ...entry.channelConstants,
            outcome: entry.latest.outcome as SimpleEthAllocation
          };
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
  invokeCreateChannelAndDirectFundProtocol: () => {
    return new Promise(() => {
      /* mock*/
    }) as any;
  },
  invokeCreateChannelConfirmation: () => {
    return new Promise(() => {
      /* Mock call */
    }) as any;
  },
  getDataForCreateChannelConfirmation: () => {
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
