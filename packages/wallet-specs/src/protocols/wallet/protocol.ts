import {
  AnyEventObject,
  assign,
  AssignAction,
  Machine,
  spawn,
  State,
} from 'xstate';
import { CreateChannel, JoinChannel } from '..';
import {
  forwardChannelUpdated,
  getChannelID,
  pretty,
  Store,
  unreachable,
} from '../..';
import { ChannelUpdated } from '../../store';
import {
  FundingStrategyProposed,
  OpenChannel,
  SendStates,
} from '../../wire-protocol';

const PROTOCOL = 'wallet';
export type Events =
  | OpenChannelEvent
  | CreateChannelEvent
  | SendStates
  | FundingStrategyProposed;
export type Process = {
  id: string;
  ref: any;
};

export interface Init {
  id: string;
  processes: Process[];
}

function forwardToChildren(_ctx, event: Events, { state }) {
  switch (event.type) {
    case 'FUNDING_STRATEGY_PROPOSED':
      state.context.processes.forEach(({ ref }: Process) => ref.send(event));
      break;
    case 'CREATE_CHANNEL':
    case 'OPEN_CHANNEL':
    case 'SendStates':
      break;
    default:
      unreachable(event);
  }
}
const config = {
  key: PROTOCOL,
  initial: 'running',
  context: { processes: [], id: 'unknown' },
  states: {
    running: {
      on: {
        OPEN_CHANNEL: { actions: 'spawnJoinChannel' },
        CREATE_CHANNEL: { actions: 'spawnCreateChannel' },
        '*': { actions: ['updateStore', forwardToChildren] },
      },
    },
  },
};

export type OpenChannelEvent = OpenChannel;

export type CreateChannelEvent = CreateChannel.Init & {
  type: 'CREATE_CHANNEL';
};

export { config };
export type Actions = {
  spawnJoinChannel: AssignAction<Init, OpenChannelEvent>;
  spawnCreateChannel: AssignAction<Init, CreateChannelEvent>;
  forwardToChildren: typeof forwardToChildren;
  updateStore: any; // TODO
};

function addLogs(process: Process, ctx): Process {
  process.ref
    .onTransition(state =>
      console.log(
        pretty({
          actor: `${ctx.id}.${process.id}`,
          TRANSITION: { state: state.value },
        })
      )
    )
    .onEvent(event => {
      console.log(
        pretty({
          actor: `${ctx.id}.${process.id}`,
          EVENT: { event: event.type },
        })
      );
    });

  return process;
}

export function machine(store: Store, context: Init) {
  const spawnCreateChannel = assign(
    (ctx: Init, { type, ...init }: CreateChannelEvent): Init => {
      const processId = `create-channel`;
      if (ctx.processes.find(p => p.id === processId)) {
        throw new Error('Process exists');
      }

      const process = addLogs(
        {
          id: processId,
          ref: spawn(
            CreateChannel.machine(store, init).withContext(init),
            processId
          ),
        },
        ctx
      );

      return {
        ...ctx,
        processes: ctx.processes.concat([process]),
      };
    }
  );

  const spawnJoinChannel = assign((ctx: Init, event: OpenChannelEvent) => {
    const channelId = getChannelID(event.signedState.state.channel);
    const processId = `join-${channelId}`;
    if (ctx.processes.find(p => p.id === processId)) {
      throw new Error('Process exists');
    }
    const joinChannelMachine = JoinChannel.machine(store, { channelId });
    const process = addLogs(
      {
        id: processId,
        ref: spawn(joinChannelMachine, processId),
      },
      ctx
    );
    process.ref.send(event);
    return {
      ...ctx,
      processes: ctx.processes.concat([process]),
    };
  });

  // TODO: Should this send `CHANNEL_UPDATED` to children?
  const updateStore = (_ctx, event: Events, { state }) => {
    let channelId: string = '';
    switch (event.type) {
      case 'OPEN_CHANNEL':
        store.receiveStates([event.signedState]);
        channelId = getChannelID(event.signedState.state.channel);
        break;
      case 'SendStates':
        store.receiveStates(event.signedStates);
        channelId = getChannelID(event.signedStates[0].state.channel);
        break;
      case 'CREATE_CHANNEL':
      case 'FUNDING_STRATEGY_PROPOSED':
        break;
      default:
        unreachable(event);
    }

    if (channelId) {
      const channelUpdated: ChannelUpdated = {
        type: 'CHANNEL_UPDATED',
        channelId,
      };
      state.context.processes.forEach(({ ref }: Process) =>
        ref.send(channelUpdated)
      );
    }
  };

  const options: { actions: Actions } = {
    actions: {
      spawnCreateChannel,
      spawnJoinChannel,
      forwardToChildren,
      updateStore,
    },
  };

  return Machine(config, options).withContext(context);
}
