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
  StateMachine,
  State
} from 'xstate';

import {MessagingServiceInterface, convertToChannelResult} from '../messaging';
import {filter, map} from 'rxjs/operators';
import {createMockGuard, unreachable} from '../utils';

import {Store} from '../store';
import {StateVariables} from '../store/types';
import {ChannelStoreEntry} from '../store/channel-store-entry';
import {bigNumberify} from 'ethers/utils';
import {ConcludeChannel, CreateAndFund, Confirm as CCC} from './';

import {
  PlayerStateUpdate,
  ChannelUpdated,
  JoinChannelEvent,
  CreateChannelEvent,
  PlayerRequestConclude,
  OpenEvent
} from '../event-types';
import {FundingStrategy} from '@statechannels/client-api-schema';
import _ from 'lodash';

export interface WorkflowContext {
  applicationSite: string;
  fundingStrategy: FundingStrategy;
  channelId?: string;
  requestObserver?: any;
  updateObserver?: any;
  requestId?: number;
  channelParams?: Omit<CreateChannelEvent, 'type'>;
}

type CreateInit = WorkflowContext & CreateChannelEvent;
type JoinInit = WorkflowContext & {channelId: string; type: 'JOIN_CHANNEL'};
export type Init = CreateInit | JoinInit;
type ChannelIdExists = WorkflowContext & {channelId: string};
type RequestIdExists = WorkflowContext & {requestId: number};

type Guards<Keys extends string> = Record<Keys, Condition<WorkflowContext, WorkflowEvent>>;
type WorkflowGuards = Guards<
  | 'channelOpen'
  | 'channelClosing'
  | 'channelClosed'
  | 'isDirectFunding'
  | 'isLedgerFunding'
  | 'isVirtualFunding'
  | 'amCreator'
  | 'amJoiner'
>;

export interface WorkflowActions {
  setApplicationSite: Action<ChannelIdExists, JoinChannelEvent>;
  sendUpdateChannelResponse: Action<any, PlayerStateUpdate>;
  sendCloseChannelResponse: Action<ChannelIdExists, any>;
  sendCreateChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  sendJoinChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  assignChannelId: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>;
  hideUi: Action<WorkflowContext, any>;
  sendChannelUpdatedNotification: Action<WorkflowContext, any>;
  spawnObservers: AssignAction<ChannelIdExists, any>;
  updateStoreWithPlayerState: Action<WorkflowContext, PlayerStateUpdate>;
}

export type WorkflowEvent =
  | PlayerRequestConclude
  | PlayerStateUpdate
  | OpenEvent
  | ChannelUpdated
  | JoinChannelEvent
  | DoneInvokeEvent<keyof WorkflowServices>;

export type WorkflowServices = {
  createChannel: (context: WorkflowContext, event: WorkflowEvent) => Promise<string>;
  invokeClosingProtocol: (
    context: ChannelIdExists
  ) => StateMachine<ConcludeChannel.Init, any, any, any>;
  invokeCreateChannelAndFundProtocol: (
    context,
    event: DoneInvokeEvent<CreateAndFund.Init>
  ) => StateMachine<any, any, any, any>;
  invokeCreateChannelConfirmation: CCC.WorkflowMachine;
};
interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  states: {
    branchingOnFundingStrategy: {};
    confirmingWithUser: {};
    creatingChannel: {};
    joiningChannel: {};
    openChannelAndFundProtocol: {};
    running: {};
    closing: {};
    done: {};
    failure: {};
  };
}
export type StateValue = keyof WorkflowStateSchema['states'];

export type WorkflowState = State<WorkflowContext, WorkflowEvent, WorkflowStateSchema, any>;

const generateConfig = (
  actions: WorkflowActions,
  guards: WorkflowGuards
): MachineConfig<WorkflowContext, WorkflowStateSchema, WorkflowEvent> => ({
  id: 'application-workflow',
  initial: 'joiningChannel',
  on: {CHANNEL_UPDATED: {actions: [actions.sendChannelUpdatedNotification]}},
  states: {
    joiningChannel: {
      initial: 'joining',
      states: {
        failure: {},
        joining: {
          on: {
            '': [
              {target: 'failure', cond: guards.isLedgerFunding}, // TODO: Should we even support ledger funding?
              {target: 'done', cond: guards.amCreator}
            ],
            JOIN_CHANNEL: {
              target: 'done',
              actions: [actions.sendJoinChannelResponse, actions.setApplicationSite]
            }
          }
        },
        done: {type: 'final'}
      },
      onDone: [
        {target: 'confirmingWithUser', cond: guards.isDirectFunding},
        {target: 'creatingChannel', cond: guards.isVirtualFunding}
      ]
    },
    confirmingWithUser: {
      // FIXME We should keep track of whether the UI was turned on in the context.
      // That way, at the end, we know whether we have to send hideUI
      entry: [actions.displayUi, 'assignUIState'],
      invoke: {src: 'invokeCreateChannelConfirmation', onDone: 'creatingChannel'}
    },
    creatingChannel: {
      on: {'': {target: 'fundingChannel', cond: guards.amJoiner}},
      invoke: {
        data: (_, event) => event.data,
        src: 'createChannel',
        onDone: {
          target: 'fundingChannel',
          actions: [actions.assignChannelId, actions.sendCreateChannelResponse]
        }
      }
    },
    fundingChannel: {
      invoke: {
        src: 'invokeCreateChannelAndFundProtocol',
        data: (ctx: ChannelIdExists): CreateAndFund.Init => ({
          channelId: ctx.channelId,
          funding: ctx.fundingStrategy
        }),
        onDone: 'running'
      }
    },
    running: {
      entry: [actions.hideUi, actions.spawnObservers],
      on: {
        // TODO: It would be nice to get rid of this event, which is used
        // in testing when starting the workflow in the 'running' state.
        SPAWN_OBSERVERS: {actions: actions.spawnObservers},
        PLAYER_STATE_UPDATE: {
          target: 'running',
          actions: [actions.updateStoreWithPlayerState, actions.sendUpdateChannelResponse]
        },
        CHANNEL_UPDATED: [{target: 'closing', cond: guards.channelClosing}],
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
        autoForward: true,
        onDone: {target: 'done', actions: [actions.sendCloseChannelResponse]}
      }
    },
    done: {type: 'final'}
  } as any // TODO: This is to deal with some flickering compilation issues.
});

export const workflow = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context?: Init
) => {
  const notifyOnChannelRequest = ({channelId}: ChannelIdExists) =>
    messagingService.requestFeed.pipe(
      filter(
        r =>
          (r.type === 'PLAYER_STATE_UPDATE' || r.type === 'PLAYER_REQUEST_CONCLUDE') &&
          r.channelId === channelId
      )
    );

  const notifyOnUpdate = ({channelId}: ChannelIdExists) =>
    store
      .channelUpdatedFeed(channelId)
      .pipe(map(storeEntry => ({type: 'CHANNEL_UPDATED', storeEntry})));

  const actions: WorkflowActions = {
    setApplicationSite: async (ctx: ChannelIdExists, event: JoinChannelEvent) =>
      await store.setApplicationSite(ctx.channelId, event.applicationSite),
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
      messagingService.sendDisplayMessage('Show');
    },
    hideUi: () => {
      messagingService.sendDisplayMessage('Hide');
    },
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
    channelOpen: (context: ChannelIdExists, event: ChannelUpdated): boolean =>
      !event.storeEntry.latestSignedByMe.isFinal,
    channelClosing: (context: ChannelIdExists, event: ChannelUpdated): boolean =>
      !!event.storeEntry.latest?.isFinal,
    channelClosed: (_, event: any): boolean => !!event.storeEntry.supported?.isFinal,
    isDirectFunding: (ctx: Init) => ctx.fundingStrategy === 'Direct',
    isLedgerFunding: (ctx: Init) => ctx.fundingStrategy === 'Ledger',
    isVirtualFunding: (ctx: Init) => ctx.fundingStrategy === 'Virtual',
    amCreator: (ctx: Init) => ctx.type === 'CREATE_CHANNEL',
    amJoiner: (ctx: Init) => ctx.type === 'JOIN_CHANNEL'
  };

  const services: WorkflowServices = {
    createChannel: async (context: CreateInit) => {
      const {
        participants,
        challengeDuration,
        outcome,
        appData,
        appDefinition,
        fundingStrategy,
        applicationSite
      } = context;
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
        appDefinition,
        applicationSite
      );

      // Create a open channel objective so we can coordinate with all participants
      await store.addObjective({
        type: 'OpenChannel',
        data: {targetChannelId: channelId, fundingStrategy},
        participants
      });
      return channelId;
    },
    invokeClosingProtocol: (context: ChannelIdExists) =>
      ConcludeChannel.machine(store).withContext({channelId: context.channelId}),
    invokeCreateChannelAndFundProtocol: (_, event: DoneInvokeEvent<CreateAndFund.Init>) =>
      CreateAndFund.machine(store, event.data),
    invokeCreateChannelConfirmation: CCC.workflow({})
  };

  const config = generateConfig(actions, guards);
  return Machine(config).withConfig({services}, context);
};

const mockGuards: WorkflowGuards = {
  channelOpen: createMockGuard('channelOpen'),
  channelClosing: createMockGuard('channelClosing'),
  channelClosed: createMockGuard('channelClosed'),
  isDirectFunding: createMockGuard('isDirectFunding'),
  isLedgerFunding: createMockGuard('isLedgerFunding'),
  isVirtualFunding: createMockGuard('isVirtualFunding'),
  amCreator: createMockGuard('amCreator'),
  amJoiner: createMockGuard('amJoiner')
};

const mockActions: Record<keyof WorkflowActions, string> = {
  setApplicationSite: 'setApplicationSite',
  assignChannelId: 'assignChannelId',
  sendChannelUpdatedNotification: 'sendChannelUpdatedNotification',
  sendCloseChannelResponse: 'sendCloseChannelResponse',
  sendCreateChannelResponse: 'sendCreateChannelResponse',
  sendJoinChannelResponse: 'sendJoinChannelResponse',
  sendUpdateChannelResponse: 'sendUpdateChannelResponse',
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  spawnObservers: 'spawnObservers',
  updateStoreWithPlayerState: 'updateStoreWithPlayerState'
};

export const config = generateConfig(mockActions as any, mockGuards);
export const mockOptions = {guards: mockGuards};

type AssignChannelEvent =
  | PlayerStateUpdate
  | JoinChannelEvent
  | (DoneInvokeEvent<string> & {type: 'done.invoke.createChannel'});
