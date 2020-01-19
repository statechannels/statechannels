import { assign, AssignAction, Interpreter, Machine, spawn, MachineConfig } from 'xstate';
import { CreateChannel, JoinChannel } from '..';
import { getChannelId, pretty, unreachable } from '../..';
import { ChannelUpdated, IStore } from '../../store';
import { FundingStrategyProposed, OpenChannel, SendStates } from '../../wire-protocol';
import { invokedState } from '../../utils';

const PROTOCOL = 'wallet';
export type Events = OpenChannelEvent | CreateChannelEvent | SendStates | FundingStrategyProposed;
export type Process = {
  id: string;
  ref: Interpreter<any, any, any>;
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
const config: MachineConfig<Init, any, Events> = {
  key: PROTOCOL,
  initial: 'running',
  context: { processes: [], id: 'unknown' },
  states: {
    running: {
      on: {
        CREATE_CHANNEL: { actions: 'spawnCreateChannel' },
        OPEN_CHANNEL: { actions: 'spawnJoinChannel' },
        SendStates: { actions: ['updateStore', forwardToChildren] },
        FUNDING_STRATEGY_PROPOSED: { actions: forwardToChildren },
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

function addLogs(walletProcess: Process, ctx): Process {
  walletProcess.ref
    .onTransition(state =>
      console.log(` TRANSITION: { ${walletProcess.id}: ${invokedState({ state } as any)} },`)
    )
    .onEvent(event => {
      console.log(
        pretty({
          actor: `${ctx.id}.${walletProcess.id}`,
          EVENT: { event: event.type },
        })
      );
    });

  return walletProcess;
}

export function machine(store: IStore, context: Init) {
  const spawnCreateChannel = assign(
    (ctx: Init, { type, ...init }: CreateChannelEvent): Init => {
      const processId = `create-channel`;
      if (ctx.processes.find(p => p.id === processId)) {
        throw new Error('Process exists');
      }

      const walletProcess: Process = {
        id: processId,
        ref: spawn<CreateChannel.Init, any>(
          CreateChannel.machine(store, init).withContext(init),
          processId
        ),
      };
      if (process.env.ADD_LOGS) {
        addLogs(walletProcess, ctx);
      }

      return {
        ...ctx,
        processes: ctx.processes.concat([walletProcess]),
      };
    }
  );

  const spawnJoinChannel = assign((ctx: Init, event: OpenChannelEvent) => {
    const channelId = getChannelId(event.signedState.state.channel);
    const processId = `join-${channelId}`;
    if (ctx.processes.find(p => p.id === processId)) {
      throw new Error('Process exists');
    }

    const joinChannelMachine = JoinChannel.machine(store, event);
    const walletProcess: Process = {
      id: processId,
      ref: spawn(joinChannelMachine, processId),
    };
    if (process.env.ADD_LOGS) {
      addLogs(walletProcess, ctx);
    }
    return {
      ...ctx,
      processes: ctx.processes.concat([walletProcess]),
    };
  });

  // TODO: Should this send `CHANNEL_UPDATED` to children?
  const updateStore = (_ctx, event: SendStates, { state }) => {
    store.receiveStates(event.signedStates);
    const channelId = getChannelId(event.signedStates[0].state.channel);
    const channelUpdated: ChannelUpdated = {
      type: 'CHANNEL_UPDATED',
      channelId,
    };
    state.context.processes.forEach(({ ref }: Process) => ref.send(channelUpdated));
  };

  const options: { actions: Actions } = {
    actions: {
      spawnCreateChannel,
      spawnJoinChannel,
      forwardToChildren,
      updateStore,
    },
  };

  return Machine(config).withConfig(options, context);
}
