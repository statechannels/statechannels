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
  StateNodeConfig,
  State
} from 'xstate';

import {getChannelId} from '@statechannels/nitro-protocol';
import * as CreateAndDirectFund from './create-and-direct-fund';
import {sendDisplayMessage, MessagingServiceInterface, convertToChannelResult} from '../messaging';
import {filter} from 'rxjs/operators';
import * as CCC from './confirm-create-channel';
import {Participant} from '@statechannels/client-api-schema';
import {createMockGuard, getDataAndInvoke} from '../utils/workflow-utils';
import {Store} from '../store/memory-store';
import {StateVariables, SimpleAllocation} from '../store/types';
import {ChannelStoreEntry} from '../store/memory-channel-storage';
import {bigNumberify, BigNumber} from 'ethers/utils';
import * as ConcludeChannel from './conclude-channel';
import {isSimpleEthAllocation} from '../utils/outcome';
import {unreachable} from '../utils';

export interface WorkflowContext {
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
  assignChannelId: Action<WorkflowContext, any>;
  assignChannelParams: Action<WorkflowContext, CreateChannelEvent>;
  displayUi: Action<WorkflowContext, any>;
  hideUi: Action<WorkflowContext, any>;
  sendChannelUpdatedNotification: Action<WorkflowContext, any>;
  spawnObserver: AssignAction<ChannelIdExists, any>;
  updateStoreWithPlayerState: Action<WorkflowContext, PlayerStateUpdate>;
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
  outcome: SimpleAllocation;
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

export interface PlayerStateUpdate {
  type: 'PLAYER_STATE_UPDATE';
  outcome: SimpleAllocation;
  channelId: string;
  appData: string;
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
export type StateValue = keyof WorkflowStateSchema['states'];

export type WorkflowState = State<WorkflowContext, WorkflowEvent, WorkflowStateSchema, any>;

const generateConfig = (
  actions: WorkflowActions,
  guards: WorkflowGuards
): MachineConfig<WorkflowContext, WorkflowStateSchema, WorkflowEvent> => ({
  id: 'application-workflow',
  initial: 'initializing',
  on: {CHANNEL_UPDATED: {actions: [actions.sendChannelUpdatedNotification]}},
  states: {
    initializing: {
      entry: actions.displayUi,
      on: {
        CREATE_CHANNEL: {
          target: 'confirmCreateChannelWorkflow',
          actions: [actions.assignChannelParams]
        },
        JOIN_CHANNEL: {target: 'confirmJoinChannelWorkflow'}
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
        PLAYER_STATE_UPDATE: {
          target: 'running',
          actions: [actions.updateStoreWithPlayerState]
        },
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
    }),
    updateStoreWithPlayerState: async (context: ChannelIdExists, event: PlayerStateUpdate) => {
      if (context.channelId === event.channelId) {
        const existingState = await (await store.getEntry(event.channelId)).latest;
        const newState = {
          ...existingState,
          turnNum: existingState.turnNum.add(1),
          appData: event.appData,
          outcome: event.outcome
        };
        store.signAndAddState(event.channelId, newState);
      }
    }
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
      // Create a open channel objective so we can coordinate with all participants
      await store.addObjective({
        type: 'OpenChannel',
        data: {targetChannelId: channelId},
        participants
      });
      return channelId;
    },
    invokeClosingProtocol: (context: ChannelIdExists) =>
      // TODO: Close machine needs to accept new store
      ConcludeChannel.machine(store, {channelId: context.channelId}),
    invokeCreateChannelAndDirectFundProtocol: (
      context,
      event: DoneInvokeEvent<CreateAndDirectFund.Init>
    ) => CreateAndDirectFund.machine(store, event.data),
    invokeCreateChannelConfirmation: (context, event: DoneInvokeEvent<CCC.WorkflowContext>) =>
      CCC.confirmChannelCreationWorkflow(store, event.data),
    getDataForCreateChannelAndDirectFund: async (
      context: WorkflowContext,
      event
    ): Promise<CreateAndDirectFund.Init> => {
      const entry = await store.getEntry(context.channelId);
      const {outcome} = entry.latest;
      if (!isSimpleEthAllocation(outcome)) {
        throw new Error('Only simple eth allocation currently supported');
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
            outcome: entry.latest.outcome as SimpleAllocation
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
  sendChannelUpdatedNotification: 'sendChannelUpdatedNotification',
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  assignChannelId: 'assignChannelId',
  spawnObserver: 'spawnObserver' as any,
  updateStoreWithPlayerState: 'updateStoreWithPlayerState'
};
const mockGuards: WorkflowGuards = {
  channelOpen: createMockGuard('channelOpen'),
  channelClosing: createMockGuard('channelClosing'),
  channelClosed: createMockGuard('channelClosed')
};
export const config = generateConfig(mockActions, mockGuards);
export const mockOptions = {services: mockServices, actions: mockActions, guards: mockGuards};
