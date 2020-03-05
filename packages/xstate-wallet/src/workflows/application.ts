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
import {filter, map} from 'rxjs/operators';
import * as CCC from './confirm-create-channel';
import {createMockGuard, getDataAndInvoke} from '../utils/workflow-utils';
import {Store} from '../store/memory-store';
import {StateVariables, SimpleAllocation} from '../store/types';
import {ChannelStoreEntry} from '../store/memory-channel-storage';
import {bigNumberify} from 'ethers/utils';
import * as ConcludeChannel from './conclude-channel';
import {isSimpleEthAllocation} from '../utils/outcome';
import {unreachable} from '../utils';
import {
  PlayerRequestConclude,
  PlayerStateUpdate,
  ChannelUpdated,
  JoinChannelEvent,
  CreateChannelEvent,
  WorkflowEvent
} from '../event-types';

export interface WorkflowContext {
  channelId?: string;
  requestObserver?: any;
  updateObserver?: any;
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
  sendUpdateChannelResponse: Action<any, PlayerStateUpdate>;
  sendCloseChannelResponse: Action<any, PlayerRequestConclude>;
  sendCreateChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  sendJoinChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  assignChannelId: Action<WorkflowContext, any>;
  assignChannelParams: Action<WorkflowContext, CreateChannelEvent>;
  displayUi: Action<WorkflowContext, any>;
  hideUi: Action<WorkflowContext, any>;
  sendChannelUpdatedNotification: Action<WorkflowContext, any>;
  spawnObservers: AssignAction<ChannelIdExists, any>;
  updateStoreWithPlayerState: Action<WorkflowContext, PlayerStateUpdate>;
}

export type ApplicationWorkflowEvent = WorkflowEvent | DoneInvokeEvent<string>;
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

export type WorkflowState = State<
  WorkflowContext,
  ApplicationWorkflowEvent,
  WorkflowStateSchema,
  any
>;

const generateConfig = (
  actions: WorkflowActions,
  guards: WorkflowGuards
): MachineConfig<WorkflowContext, WorkflowStateSchema, ApplicationWorkflowEvent> => ({
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
      ) as StateNodeConfig<WorkflowContext, {}, ApplicationWorkflowEvent>),
      entry: [actions.assignChannelId, actions.spawnObservers],
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
            actions.spawnObservers,
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
      entry: [actions.hideUi],
      on: {
        //TODO: spawnObservers shouldn't be here but it makes the running integration test work (since we skip right to the running state)
        // It shouldn't cause any issues but we should probably figure a better way of handling this in the test
        SPAWN_OBSERVERS: {actions: [actions.spawnObservers]},
        PLAYER_STATE_UPDATE: {
          target: 'running',
          actions: [actions.updateStoreWithPlayerState, actions.sendUpdateChannelResponse]
        },
        CHANNEL_UPDATED: [
          {
            cond: guards.channelClosing,
            target: 'closing'
          }
        ],

        PLAYER_REQUEST_CONCLUDE: {target: 'closing', actions: [actions.sendCloseChannelResponse]}
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
  const notifyOnChannelRequest = ({channelId}: ChannelIdExists) => {
    return messagingService.requestFeed.pipe(
      filter(
        r =>
          (r.type === 'PLAYER_STATE_UPDATE' || r.type === 'PLAYER_REQUEST_CONCLUDE') &&
          r.channelId === channelId
      )
    );
  };

  const notifyOnUpdate = ({channelId}: ChannelIdExists) => {
    return store
      .channelUpdatedFeed(channelId)
      .pipe(map(s => ({type: 'CHANNEL_UPDATED', storeEntry: s})));
  };

  const actions: WorkflowActions = {
    sendUpdateChannelResponse: async (context: any, event: PlayerStateUpdate) => {
      const entry = await store.getEntry(context.channelId);
      messagingService.sendResponse(event.requestId, await convertToChannelResult(entry));
    },
    sendCloseChannelResponse: async (context: any, event: PlayerRequestConclude) => {
      const entry = await store.getEntry(context.channelId);
      messagingService.sendResponse(event.requestId, await convertToChannelResult(entry));
    },
    sendCreateChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, await convertToChannelResult(entry));
    },
    sendJoinChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, await convertToChannelResult(entry));
    },
    spawnObservers: assign<ChannelIdExists>((context: WorkflowContext & ChannelIdExists) => {
      if (!context.requestObserver || !context.updateObserver) {
        return {
          ...context,
          updateObserver: spawn(notifyOnUpdate(context)),
          requestObserver: spawn(notifyOnChannelRequest(context))
        };
      } else {
        return context;
      }
    }),

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
        await store.signAndAddState(event.channelId, newState);
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
      _,
      event: DoneInvokeEvent<CreateAndDirectFund.Init>
    ) => CreateAndDirectFund.machine(store, event.data),
    invokeCreateChannelConfirmation: (context, event: DoneInvokeEvent<CCC.WorkflowContext>) =>
      CCC.confirmChannelCreationWorkflow(store, event.data),
    getDataForCreateChannelAndDirectFund: async (
      context: WorkflowContext
    ): Promise<CreateAndDirectFund.Init> => {
      const entry = await store.getEntry(context.channelId);
      const {outcome} = entry.latest;
      if (!isSimpleEthAllocation(outcome)) {
        throw new Error('Only simple eth allocation currently supported');
      }
      return {channelId: entry.channelId, allocation: outcome};
    },
    getDataForCreateChannelConfirmation: async (
      _: WorkflowContext,
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
  sendCloseChannelResponse: 'sendCloseChannelResponse',
  sendUpdateChannelResponse: 'sendUpdateChannelResponse',
  assignChannelParams: 'assignChannelParams',
  sendCreateChannelResponse: 'sendCreateChannelResponse',
  sendJoinChannelResponse: 'sendJoinChannelResponse',
  sendChannelUpdatedNotification: 'sendChannelUpdatedNotification',
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  assignChannelId: 'assignChannelId',
  spawnObservers: 'spawnObserver' as any,
  updateStoreWithPlayerState: 'updateStoreWithPlayerState'
};
const mockGuards: WorkflowGuards = {
  channelOpen: createMockGuard('channelOpen'),
  channelClosing: createMockGuard('channelClosing'),
  channelClosed: createMockGuard('channelClosed')
};
export const config = generateConfig(mockActions, mockGuards);
export const mockOptions = {services: mockServices, actions: mockActions, guards: mockGuards};
