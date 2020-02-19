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

import {getChannelId} from '@statechannels/nitro-protocol';
import * as CreateAndDirectFund from './create-and-direct-fund';
import {sendDisplayMessage, MessagingServiceInterface, convertToChannelResult} from '../messaging';
import {filter} from 'rxjs/operators';
import * as CCC from './confirm-create-channel';
import {Participant} from '@statechannels/client-api-schema';
import {createMockGuard, getDataAndInvoke} from '../utils/workflow-utils';
import {Store} from '../store/memory-store';
import {StateVariables, SimpleEthAllocation} from '../store/types';
import {ChannelStoreEntry} from '../store/memory-channel-storage';
import {bigNumberify, BigNumber} from 'ethers/utils';
import * as ConcludeChannel from './conclude-channel';
import {unreachable} from '../utils';

interface WorkflowContext {
  channelId?: string;
  observer?: any;
  requestId?: number;
  channelParams?: Omit<CreateChannelEvent, 'type'>;
}
type ChannelParamsExist = WorkflowContext & {channelParams: CCC.WorkflowContext};
type ChannelIdExists = WorkflowContext & {channelId: string};
type RequestIdExists = WorkflowContext & {requestId: number};

interface WorkflowGuards {
  channelOpen: Condition<WorkflowContext, WorkflowEvent>;
  channelClosing: Condition<WorkflowContext, WorkflowEvent>;
  channelClosed: Condition<WorkflowContext, WorkflowEvent>;
}

export interface WorkflowActions {
  sendCreateChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  sendJoinChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  sendToOpponent: Action<WorkflowContext, PlayerStateUpdate>;
  assignChannelId: Action<WorkflowContext, any>;
  assignChannelParams: Action<WorkflowContext, CreateChannelEvent>;
  displayUi: Action<WorkflowContext, any>;
  hideUi: Action<WorkflowContext, any>;
  sendChannelUpdatedNotification: Action<WorkflowContext, any>;
  spawnObserver: AssignAction<ChannelIdExists, any>;
}

export interface JoinChannelEvent {
  type: 'JOIN_CHANNEL';
  channelId: string;
  requestId: number;
}
// Events
export type OpenEvent = CreateChannelEvent | JoinChannelEvent;

export interface CreateChannelEvent {
  type: 'CREATE_CHANNEL';
  participants: Participant[];
  outcome: SimpleEthAllocation;
  appDefinition: string;
  appData: string;
  challengeDuration: BigNumber;
  chainId: string;
  requestId: number;
}

export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  storeEntry: ChannelStoreEntry;
  requestId: number;
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
    context,
    event: DoneInvokeEvent<CreateAndDirectFund.Init>
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
  actions: WorkflowActions,
  guards: WorkflowGuards
): MachineConfig<WorkflowContext, WorkflowStateSchema, WorkflowEvent> => ({
  id: 'application-workflow',
  initial: 'initializing',
  on: {CHANNEL_UPDATED: {actions: [actions.sendChannelUpdatedNotification]}},
  states: {
    initializing: {
      on: {
        CREATE_CHANNEL: {
          target: 'confirmCreateChannelWorkflow',
          actions: [actions.assignChannelParams]
        },
        JOIN_CHANNEL: {target: 'confirmJoinChannelWorkflow', actions: [actions.assignChannelId]}
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
        'invokeCreateChannelConfirmation',
        'openChannelAndDirectFundProtocol'
      ) as StateNodeConfig<WorkflowContext, {}, WorkflowEvent>),
      entry: [actions.assignChannelId, actions.spawnObserver],
      exit: [actions.sendJoinChannelResponse]
    },
    createChannelInStore: {
      invoke: {
        data: (context, event) => event.data,
        src: 'createChannel',
        onDone: {
          target: 'openChannelAndDirectFundProtocol',
          actions: [
            actions.assignChannelId,
            actions.spawnObserver,
            actions.sendCreateChannelResponse
          ]
        }
      }
    },

    openChannelAndDirectFundProtocol: getDataAndInvoke(
      'getDataForCreateChannelAndDirectFund',
      'invokeCreateChannelAndDirectFundProtocol',
      'running'
    ),
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
    done: {type: 'final'}
  }
});

export const applicationWorkflow = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context?: WorkflowContext
) => {
  const notifyOnChannelMessage = ({channelId}: ChannelIdExists) => {
    return messagingService.requestFeed.pipe(
      filter(
        r =>
          (r.method === 'UpdateChannel' || r.method === 'CloseChannel') &&
          r.params.channelId === channelId
      )
    );
  };

  const actions: WorkflowActions = {
    sendCreateChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, await convertToChannelResult(entry));
    },
    sendJoinChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      await messagingService.sendResponse(context.requestId, context.channelId);
    },
    spawnObserver: assign<ChannelIdExists>(context => ({
      ...context,
      // TODO: Do protocols register themselves against the store for state updates? Or do we need to handle them
      observer: spawn(notifyOnChannelMessage(context))
    })),

    sendToOpponent: (context: ChannelIdExists, event) => {
      store.signAndAddState(context.channelId, event.state);
    },
    sendChannelUpdatedNotification: async (
      context: ChannelIdExists,
      event: {storeEntry: ChannelStoreEntry}
    ) => {
      if (event.storeEntry.channelId === context.channelId) {
        messagingService.sendChannelNotification(
          'ChannelUpdated',
          await convertToChannelResult(event.storeEntry)
        );
      }
    },
    displayUi: () => {
      sendDisplayMessage('Show');
    },
    hideUi: () => {
      sendDisplayMessage('Hide');
    },
    assignChannelParams: assign(
      (
        context: WorkflowContext,
        event: CreateChannelEvent
      ): ChannelParamsExist & RequestIdExists => {
        return {
          ...context,
          channelParams: event,
          requestId: event.requestId
        };
      }
    ),
    assignChannelId: assign((context, event) => {
      if (!context.channelId) {
        if (event.type === 'PLAYER_STATE_UPDATE') {
          return {channelId: getChannelId(event.state.channel)};
        } else if (event.type === 'JOIN_CHANNEL') {
          // TODO: Might be better to split set request Id in it's own action
          return {channelId: event.channelId, requestId: event.requestId};
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
    createChannel: async (context: ChannelParamsExist) => {
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
      const {channelId} = await store.createChannel(
        participants,
        bigNumberify(challengeDuration),
        stateVars,
        appDefinition
      );
      return channelId;
    },
    invokeClosingProtocol: (context: ChannelIdExists) => {
      // TODO: Close machine needs to accept new store
      return ConcludeChannel.machine(store, {channelId: context.channelId});
    },
    invokeCreateChannelAndDirectFundProtocol: (
      context,
      event: DoneInvokeEvent<CreateAndDirectFund.Init>
    ) => {
      return CreateAndDirectFund.machine(store, event.data);
    },
    invokeCreateChannelConfirmation: (context, event: DoneInvokeEvent<CCC.WorkflowContext>) => {
      return CCC.confirmChannelCreationWorkflow(store, event.data);
    },
    getDataForCreateChannelAndDirectFund: async (
      context: WorkflowContext,
      event
    ): Promise<CreateAndDirectFund.Init> => {
      const entry = await store.getEntry(context.channelId);
      const {outcome} = entry.latest;
      if (outcome.type !== 'SimpleEthAllocation') {
        throw new Error('TODO');
      }
      return {
        channelId: entry.channelId,
        ...entry.channelConstants,
        allocation: outcome,
        index: entry.myIndex,
        ...entry.latest
      };
    },
    getDataForCreateChannelConfirmation: async (
      context: WorkflowContext,
      event: CreateChannelEvent | JoinChannelEvent
    ): Promise<CCC.WorkflowContext> => {
      switch (event.type) {
        case 'CREATE_CHANNEL':
          return event;
        case 'JOIN_CHANNEL':
          const entry = await store.getEntry(event.channelId);
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
  assignChannelParams: 'assignChannelParams',
  sendCreateChannelResponse: 'sendCreateChannelResponse',
  sendJoinChannelResponse: 'sendJoinChannelResponse',
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
