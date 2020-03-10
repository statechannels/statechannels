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
  State
} from 'xstate';

import {sendDisplayMessage, MessagingServiceInterface, convertToChannelResult} from '../messaging';
import {filter, map, tap, flatMap, first} from 'rxjs/operators';
import * as CCC from './confirm-create-channel';
import {createMockGuard, getDataAndInvoke} from '../utils/workflow-utils';
import {Store} from '../store';
import {StateVariables} from '../store/types';
import {ChannelStoreEntry} from '../store/channel-store-entry';
import {bigNumberify} from 'ethers/utils';
import * as ConcludeChannel from './conclude-channel';
import {isSimpleEthAllocation} from '../utils/outcome';
import {unreachable, checkThat} from '../utils';
import {
  PlayerStateUpdate,
  ChannelUpdated,
  JoinChannelEvent,
  CreateChannelEvent,
  WorkflowEvent
} from '../event-types';
import {CreateAndFund} from '.';

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
  sendCloseChannelResponse: Action<ChannelIdExists, any>;
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

  invokeCreateChannelAndFundProtocol: (
    context,
    event: DoneInvokeEvent<CreateAndFund.Init>
  ) => StateMachine<any, any, any, any>;
  invokeCreateChannelConfirmation: (
    context: ChannelParamsExist,
    event: DoneInvokeEvent<CCC.WorkflowContext>
  ) => CCC.WorkflowMachine;
  getDataForCreateChannelConfirmation: (
    context: WorkflowContext,
    event: CreateChannelEvent | JoinChannelEvent
  ) => Promise<CCC.WorkflowContext>;
  signConcludeState: (context: WorkflowContext, event: any) => Promise<void>;
}
interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  states: {
    initializing: {};
    confirmCreateChannelWorkflow: {};
    confirmJoinChannelWorkflow: {
      initial: 'signFirstState';
      states: {
        signFirstState: {};
        confirmChannelCreation: {};
        done: {};
      };
    };
    openChannelAndFundProtocol: {};
    createChannelInStore: {};
    concludeState: {};
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
    concludeState: {invoke: {src: 'signConcludeState', onDone: {target: 'closing'}}},
    confirmCreateChannelWorkflow: getDataAndInvoke(
      'getDataForCreateChannelConfirmation',
      'invokeCreateChannelConfirmation',
      'createChannelInStore'
    ),
    confirmJoinChannelWorkflow: {
      initial: 'signFirstState',
      states: {
        signFirstState: {invoke: {src: 'signFirstState', onDone: 'confirmChannelCreation'}},
        confirmChannelCreation: getDataAndInvoke(
          'getDataForCreateChannelConfirmation',
          'invokeCreateChannelConfirmation',
          'done'
        ),
        done: {type: 'final'}
      },
      entry: [actions.assignChannelId, actions.spawnObservers],
      exit: [actions.sendJoinChannelResponse],
      onDone: 'openChannelAndFundProtocol'
    },
    createChannelInStore: {
      invoke: {
        data: (context, event) => event.data,
        src: 'createChannel',
        onDone: {
          target: 'openChannelAndFundProtocol',
          actions: [
            actions.assignChannelId,
            actions.spawnObservers,
            actions.sendCreateChannelResponse
          ]
        }
      }
    },

    openChannelAndFundProtocol: getDataAndInvoke(
      'getDataForCreateChannelAndFund',
      'invokeCreateChannelAndFundProtocol',
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
            target: 'concludeState'
          }
        ],

        PLAYER_REQUEST_CONCLUDE: {
          target: 'concludeState'
        }
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
        autoForward: true,
        onDone: {
          target: 'done',
          actions: [actions.sendCloseChannelResponse]
        }
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
      .pipe(map(storeEntry => ({type: 'CHANNEL_UPDATED', storeEntry})));
  };

  const actions: WorkflowActions = {
    sendUpdateChannelResponse: async (context: any, event: PlayerStateUpdate) => {
      const entry = await store.getEntry(context.channelId);
      messagingService.sendResponse(event.requestId, await convertToChannelResult(entry));
    },
    sendCloseChannelResponse: async (context: ChannelIdExists, event: any) => {
      const entry = await store.getEntry(context.channelId);
      if (context.requestId) {
        messagingService.sendResponse(event.requestId, await convertToChannelResult(entry));
      }
    },
    sendCreateChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, await convertToChannelResult(entry));
    },
    sendJoinChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, await convertToChannelResult(entry));
    },
    spawnObservers: assign<ChannelIdExists>((context: ChannelIdExists) => ({
      ...context,
      updateObserver: context.updateObserver ?? spawn(notifyOnUpdate(context)),
      requestObserver: context.requestObserver ?? spawn(notifyOnChannelRequest(context))
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
    assignChannelId: assign((context, event: AssignChannelEvent) => {
      if (context.channelId) return context;
      switch (event.type) {
        case 'PLAYER_STATE_UPDATE':
          return {channelId: event.channelId};
        case 'JOIN_CHANNEL':
          // TODO: Might be better to split set request Id in it's own action
          return {channelId: event.channelId, requestId: event.requestId};
        case 'done.invoke.createChannel':
          return {channelId: event.data};
        default:
          return unreachable(event);
      }
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
      return !event.storeEntry.latestStateSupportedByMe.isFinal;
    },
    channelClosing: (context: ChannelIdExists, event: ChannelUpdated): boolean => {
      return event.storeEntry.latest?.isFinal || false;
    },

    channelClosed: (context: ChannelIdExists, event: any): boolean => {
      return event.storeEntry.supported?.isFinal || false;
    }
  };

  const services: WorkflowServices = {
    signFirstState: async ({channelId}: ChannelIdExists) =>
      store
        .channelUpdatedFeed(channelId)
        .pipe(
          flatMap(({states}) => states),
          filter(s => s.turnNum.eq(0)),
          tap(async s => await store.signAndAddState(channelId, s)),
          first()
        )
        .toPromise(),
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
    invokeCreateChannelAndFundProtocol: (_, event: DoneInvokeEvent<CreateAndFund.Init>) =>
      CreateAndFund.machine(store, event.data),
    invokeCreateChannelConfirmation: (context, event: DoneInvokeEvent<CCC.WorkflowContext>) =>
      CCC.confirmChannelCreationWorkflow(store, event.data),
    getDataForCreateChannelAndFund: async (
      context: ChannelParamsExist
    ): Promise<CreateAndFund.Init> => {
      const {latestStateSupportedByMe, channelId} = await store.getEntry(context.channelId);
      const allocation = checkThat(latestStateSupportedByMe.outcome, isSimpleEthAllocation);
      return {channelId, allocation};
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
            outcome: checkThat(entry.latest.outcome, isSimpleEthAllocation)
          };
        default:
          return unreachable(event);
      }
    },
    signConcludeState: async (context: ChannelIdExists) => {
      if (context.channelId === context.channelId) {
        const existingState = await (await store.getEntry(context.channelId)).latest;
        const newState = {
          ...existingState,
          turnNum: existingState.isFinal ? existingState.turnNum : existingState.turnNum.add(1),
          isFinal: true
        };
        await store.signAndAddState(context.channelId, newState);
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
  invokeCreateChannelAndFundProtocol: () => {
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
  },
  signConcludeState: () => {
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

type AssignChannelEvent =
  | PlayerStateUpdate
  | JoinChannelEvent
  | (DoneInvokeEvent<string> & {type: 'done.invoke.createChannel'});
