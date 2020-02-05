import {MachineConfig, Machine, assign, Action, AssignAction, spawn, Condition} from 'xstate';
import {
  FINAL,
  MachineFactory,
  CreateChannelEvent,
  OpenChannelEvent,
  ConcludeChannel,
  Store,
  SendStates,
  ChannelUpdated,
  ChannelStoreEntry,
  unreachable
} from '@statechannels/wallet-protocols';

import {State, getChannelId} from '@statechannels/nitro-protocol';

import {sendDisplayMessage, dispatchChannelUpdatedMessage, observeRequests} from '../messaging';
import {map} from 'rxjs/operators';
import * as CCC from './confirm-create-channel';
import {JoinChannelParams} from '@statechannels/client-api-schema';
// eslint-disable-next-line no-restricted-imports
import {getEthAllocation} from '@statechannels/wallet-protocols/src/calculations';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {createMockGuard} from './utils';

interface WorkflowContext {
  channelId?: string;
  observer?: any;
}

interface WorkflowGuards {
  channelOpen: Condition<WorkflowContext, WorkflowEvent>;
  channelClosing: Condition<WorkflowContext, WorkflowEvent>;
  channelClosed: Condition<WorkflowContext, WorkflowEvent>;
}

type ChannelIdExists = WorkflowContext & {channelId: string};

interface WorkflowActions {
  sendToOpponent: Action<WorkflowContext, PlayerStateUpdate>;
  assignChannelId: Action<WorkflowContext, any>;
  displayUi: Action<WorkflowContext, any>;
  hideUi: Action<WorkflowContext, any>;
  sendChannelUpdatedNotification: Action<WorkflowContext, any>;
  spawnObserver: AssignAction<ChannelIdExists, any>;
}

// a config isn't all wired up
// a machine is something that's all wired up

// Events
type OpenEvent = CreateChannelEvent | OpenChannelEvent;

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
  | JoinChannelEvent;

export type ApplicationWorkflowEvent = WorkflowEvent;

const generateConfig = (
  actions: WorkflowActions,
  guards: WorkflowGuards
): MachineConfig<WorkflowContext, any, WorkflowEvent> => ({
  id: 'application-workflow',
  initial: 'initializing',
  on: {CHANNEL_UPDATED: {actions: [actions.sendChannelUpdatedNotification]}},
  states: {
    initializing: {
      on: {CREATE_CHANNEL: 'confirmCreateChannelWorkflow', OPEN_CHANNEL: 'waitForJoin'}
    },
    waitForJoin: {
      entry: [actions.assignChannelId],
      on: {
        JoinChannel: {target: 'confirmCreateChannelWorkflow'}
      }
    },
    confirmCreateChannelWorkflow: {
      invoke: {
        src: 'invokeCreateChannelConfirmation',
        onDone: {actions: [actions.assignChannelId, actions.spawnObserver]}
      },
      onDone: {target: 'openChannelAndDirectFund'}
    },
    openChannelAndDirectFund: {onDone: 'running'},
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
        id: 'closingMachine',
        src: 'invokeClosingMachine',
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

export const applicationWorkflow: MachineFactory<WorkflowContext, any> = (
  store: Store,
  context: WorkflowContext
) => {
  // Always use an empty context instead of undefined
  if (!context) {
    context = {};
  }

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
      observer: spawn(notifyOnChannelMessage(context))
    })),

    sendToOpponent: (context, event) => {
      store.sendState(event.state);
    },
    sendChannelUpdatedNotification: (context, event) => {
      if (event.entry.states.length > 0) {
        const channelId = getChannelId(event.entry.states[0].state.channel);
        // TODO: We should filter by context.channelId but that is not being set currently
        dispatchChannelUpdatedMessage(channelId, new ChannelStoreEntry(event.entry));
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
          return {channelId: getChannelId(event.signedState.state.channel)};
        } else if (event.type === 'done.invoke.createMachine') {
          return event.data;
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
  const config = generateConfig(actions, guards);
  const services = {
    invokeClosingMachine: (context: ChannelIdExists) => {
      return ConcludeChannel.machine(store, {channelId: context.channelId});
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

  return Machine(config).withConfig({services}, context);
};

const mockServices = {
  invokeClosingMachine: () => {
    /* mock, do nothing  */
  },
  invokeCreateChannelConfirmation: () => {
    /* mock, do nothing  */
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
const mockGuards = {
  channelOpen: createMockGuard('channelOpen'),
  channelClosing: createMockGuard('channelClosing'),
  channelClosed: createMockGuard('channelClosed')
};
export const config = generateConfig(mockActions, mockGuards);
export const mockOptions = {services: mockServices, actions: mockActions, guards: mockGuards};
