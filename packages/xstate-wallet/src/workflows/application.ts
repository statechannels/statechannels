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

import {MessagingServiceInterface} from '../messaging';
import {filter, map, distinctUntilChanged} from 'rxjs/operators';
import {createMockGuard, unreachable} from '../utils';

import {Store} from '../store';
import {StateVariables} from '../store/types';
import {ChannelStoreEntry} from '../store/channel-store-entry';
import {BigNumber} from 'ethers';
import {ConcludeChannel, CreateAndFund, ChallengeChannel, Confirm as CCC} from './';

import {
  PlayerStateUpdate,
  ChannelUpdated,
  JoinChannelEvent,
  CreateChannelEvent,
  PlayerRequestConclude,
  OpenEvent
} from '../event-types';
import {FundingStrategy} from '@statechannels/client-api-schema';
import {serializeChannelEntry} from '../serde/app-messages/serialize';
import {CONCLUDE_TIMEOUT} from '../constants';
import _ from 'lodash';
import {Zero} from '@ethersproject/constants';

export interface WorkflowContext {
  applicationDomain: string;
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
  | 'channelChallenging'
  | 'isDirectFunding'
  | 'isLedgerFunding'
  | 'isVirtualFunding'
  | 'amCreator'
  | 'amJoiner'
>;

export interface WorkflowActions {
  sendChallengeChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  sendCloseChannelResponse: Action<ChannelIdExists, any>;
  sendCloseChannelRejection: Action<ChannelIdExists, any>;
  sendCreateChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  sendJoinChannelResponse: Action<RequestIdExists & ChannelIdExists, any>;
  assignChannelId: Action<WorkflowContext, any>;
  assignRequestId: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>;
  hideUi: Action<WorkflowContext, any>;
  sendChannelUpdatedNotification: Action<WorkflowContext, any>;
  spawnObservers: AssignAction<ChannelIdExists, any>;
  updateStoreAndSendResponse: Action<WorkflowContext, PlayerStateUpdate>;
}

export type WorkflowEvent =
  | PlayerRequestConclude
  | PlayerStateUpdate
  | OpenEvent
  | ChannelUpdated
  | JoinChannelEvent
  | DoneInvokeEvent<keyof WorkflowServices>;

export type WorkflowServices = {
  setapplicationDomain(ctx: ChannelIdExists, e: JoinChannelEvent): Promise<void>;
  createChannel: (context: WorkflowContext, event: WorkflowEvent) => Promise<string>;
  signFinalStateIfMyTurn: (context: ChannelIdExists) => Promise<any>;
  invokeClosingProtocol: (
    context: ChannelIdExists
  ) => StateMachine<ConcludeChannel.Init, any, any, any>;
  invokeChallengingProtocol: (
    context: ChannelIdExists
  ) => StateMachine<ChallengeChannel.Initial, any, any, any>;
  invokeCreateChannelAndFundProtocol: StateMachine<any, any, any, any>;
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
    sendChallenge: {};
    closing: {};
    done: {};
    failure: {};
    fundingChannel: {};
  };
}

export type StateValue = keyof WorkflowStateSchema['states'];

export type WorkflowState = State<WorkflowContext, WorkflowEvent, WorkflowStateSchema, any>;

const signFinalStateIfMyTurn = (store: Store) => async ({channelId}: ChannelIdExists) => {
  const entry = await store.getEntry(channelId);

  if (entry.myTurn) {
    const {supported} = entry;
    return store.signAndAddState(channelId, {
      ...supported,
      turnNum: supported.turnNum.add(1),
      isFinal: true
    });
  } else {
    throw Error('Not your turn');
  }
};

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
              target: 'settingDomain',
              actions: [actions.assignRequestId, actions.sendJoinChannelResponse]
            }
          }
        },
        settingDomain: {invoke: {src: 'setapplicationDomain', onDone: 'done'}},
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
          actions: [actions.updateStoreAndSendResponse]
        },
        CHANNEL_UPDATED: [
          {target: 'closing', cond: guards.channelClosing},
          {target: 'sendChallenge', cond: guards.channelChallenging}
        ],
        PLAYER_REQUEST_CONCLUDE: {
          target: 'attemptToSignFinalState',
          actions: [actions.assignRequestId]
        },

        PLAYER_REQUEST_CHALLENGE: {target: 'sendChallenge'}
      }
    },

    attemptToSignFinalState: {
      invoke: {
        src: signFinalStateIfMyTurn.name,
        onDone: {target: 'closing', actions: [actions.sendCloseChannelResponse]},
        onError: {target: 'running', actions: [actions.sendCloseChannelRejection]}
      },
      after: {[CONCLUDE_TIMEOUT]: 'sendChallenge'}
    },

    // This could handled by another workflow instead of the application workflow
    closing: {
      invoke: {
        id: 'closing-protocol',
        src: 'invokeClosingProtocol',
        data: context => context,
        autoForward: true,
        onDone: {target: 'done'}
      }
    },

    // This could handled by another workflow instead of the application workflow
    sendChallenge: {
      entry: actions.displayUi,
      exit: actions.hideUi,
      invoke: {
        id: 'challenge-protocol',
        src: 'invokeChallengingProtocol',
        data: context => context,
        autoForward: true,
        onDone: {target: 'running', actions: [actions.sendChallengeChannelResponse]}
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
          (r.type === 'PLAYER_STATE_UPDATE' ||
            r.type === 'PLAYER_REQUEST_CONCLUDE' ||
            r.type === 'PLAYER_REQUEST_CHALLENGE') &&
          r.channelId === channelId
      )
    );

  const notifyOnUpdate = ({channelId}: ChannelIdExists) =>
    store.channelUpdatedFeed(channelId).pipe(
      filter(storeEntry => storeEntry.isSupported),

      distinctUntilChanged((entry1, entry2) =>
        _.isEqual(serializeChannelEntry(entry1), serializeChannelEntry(entry2))
      ),

      map(storeEntry => ({
        type: 'CHANNEL_UPDATED',
        storeEntry
      }))
    );

  const actions: WorkflowActions = {
    sendCloseChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, serializeChannelEntry(entry));
    },

    sendCloseChannelRejection: async (context: RequestIdExists & ChannelIdExists) => {
      await messagingService.sendError(context.requestId, {code: 300, message: 'Not your turn'});
    },

    sendCreateChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, serializeChannelEntry(entry));
    },

    sendJoinChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, serializeChannelEntry(entry));
    },

    sendChallengeChannelResponse: async (context: RequestIdExists & ChannelIdExists) => {
      const entry = await store.getEntry(context.channelId);
      await messagingService.sendResponse(context.requestId, serializeChannelEntry(entry));
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
          serializeChannelEntry(event.storeEntry)
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
        case 'JOIN_CHANNEL':
          return {channelId: event.channelId};
        case 'done.invoke.createChannel':
          return {channelId: event.data};
        default:
          return unreachable(event);
      }
    }),
    assignRequestId: assign((context, event: JoinChannelEvent | PlayerRequestConclude) => ({
      requestId: event.requestId
    })),
    updateStoreAndSendResponse: async (context: ChannelIdExists, event: PlayerStateUpdate) => {
      // TODO: This should probably be done in a service and we should handle the failure cases
      // For now we update the store and then send the response in one action so the response has the latest state
      if (context.channelId === event.channelId) {
        const entry = await store.updateChannel(event.channelId, event);
        await messagingService.sendResponse(event.requestId, serializeChannelEntry(entry));
      }
    }
  };

  const guards: WorkflowGuards = {
    channelOpen: (context: ChannelIdExists, event: ChannelUpdated): boolean =>
      !event.storeEntry.latestSignedByMe.isFinal,

    channelClosing: (context: ChannelIdExists, event: ChannelUpdated): boolean =>
      !!event.storeEntry.latest?.isFinal,

    channelChallenging: (context: ChannelIdExists, event: ChannelUpdated): boolean =>
      !!event.storeEntry.isChallenging,

    channelClosed: (_, event: any): boolean => !!event.storeEntry.supported?.isFinal,
    isDirectFunding: (ctx: Init) => ctx.fundingStrategy === 'Direct',
    isLedgerFunding: (ctx: Init) => ctx.fundingStrategy === 'Ledger',
    isVirtualFunding: (ctx: Init) => ctx.fundingStrategy === 'Virtual',
    amCreator: (ctx: Init) => ctx.type === 'CREATE_CHANNEL',
    amJoiner: (ctx: Init) => ctx.type === 'JOIN_CHANNEL'
  };

  const services: WorkflowServices = {
    setapplicationDomain: async (ctx: ChannelIdExists, event: JoinChannelEvent) =>
      await store.setapplicationDomain(ctx.channelId, event.applicationDomain),

    signFinalStateIfMyTurn: signFinalStateIfMyTurn(store),
    createChannel: async (context: CreateInit) => {
      const {
        participants,
        challengeDuration,
        outcome,
        appData,
        appDefinition,
        fundingStrategy,
        applicationDomain
      } = context;
      const stateVars: StateVariables = {
        outcome,
        appData,
        turnNum: Zero,
        isFinal: false
      };
      const {channelId: targetChannelId} = await store.createChannel(
        participants,
        BigNumber.from(challengeDuration),
        stateVars,
        appDefinition,
        applicationDomain
      );

      // Create a open channel objective so we can coordinate with all participants
      await store.addObjective({
        type: 'OpenChannel',
        data: {targetChannelId, fundingStrategy},
        participants: [participants[1]]
      });
      return targetChannelId;
    },

    invokeClosingProtocol: (context: ChannelIdExists) =>
      ConcludeChannel.machine(store, messagingService).withContext({channelId: context.channelId}),

    invokeChallengingProtocol: ({channelId}: ChannelIdExists) =>
      ChallengeChannel.machine(store, {channelId}),

    invokeCreateChannelAndFundProtocol: CreateAndFund.machine(store),
    invokeCreateChannelConfirmation: CCC.workflow({})
  };

  const config = generateConfig(actions, guards);
  return Machine(config).withConfig({services}, context);
};

const mockGuards: WorkflowGuards = {
  channelOpen: createMockGuard('channelOpen'),
  channelClosing: createMockGuard('channelClosing'),
  channelChallenging: createMockGuard('channelChallenging'),
  channelClosed: createMockGuard('channelClosed'),
  isDirectFunding: createMockGuard('isDirectFunding'),
  isLedgerFunding: createMockGuard('isLedgerFunding'),
  isVirtualFunding: createMockGuard('isVirtualFunding'),
  amCreator: createMockGuard('amCreator'),
  amJoiner: createMockGuard('amJoiner')
};

const mockActions: Record<keyof WorkflowActions, string> = {
  assignChannelId: 'assignChannelId',
  sendChannelUpdatedNotification: 'sendChannelUpdatedNotification',
  sendCloseChannelResponse: 'sendCloseChannelResponse',
  sendCloseChannelRejection: 'sendCloseChannelRejection',
  sendChallengeChannelResponse: 'sendChallengeChannelResponse',
  sendCreateChannelResponse: 'sendCreateChannelResponse',
  sendJoinChannelResponse: 'sendJoinChannelResponse',
  hideUi: 'hideUi',
  displayUi: 'displayUi',
  spawnObservers: 'spawnObservers',
  updateStoreAndSendResponse: 'updateStoreAndSendResponse',
  assignRequestId: 'assignRequestId'
};

export const config = generateConfig(mockActions as any, mockGuards);
export const mockOptions = {guards: mockGuards};

type AssignChannelEvent =
  | PlayerStateUpdate
  | JoinChannelEvent
  | (DoneInvokeEvent<string> & {type: 'done.invoke.createChannel'});
