import { assign, AssignAction, Interpreter, Machine, spawn, MachineConfig } from 'xstate';

import { getChannelId } from '../..';
import { Store } from '../../store';
import { FundingStrategyProposed, OpenChannel, SendStates } from '../../wire-protocol';

import { CreateChannel, JoinChannel, ConcludeChannel } from '..';

const PROTOCOL = 'wallet';
export type Events =
  | OpenChannelEvent
  | CreateChannelEvent
  | ConcludeChannelEvent
  | SendStates
  | FundingStrategyProposed;

export type Process = {
  id: string;
  ref: Interpreter<any, any, any>;
};

export interface Init {
  id: string;
  processes: Process[];
}

const config: MachineConfig<Init, any, Events> = {
  key: PROTOCOL,
  initial: 'running',
  context: { processes: [], id: 'unknown' },
  states: {
    running: {
      on: {
        CREATE_CHANNEL: { actions: 'spawnCreateChannel' },
        CONCLUDE_CHANNEL: { actions: 'spawnConcludeChannel' },
        OPEN_CHANNEL: { actions: 'spawnJoinChannel' },
        SendStates: { actions: ['updateStore'] },
      },
    },
  },
};

export type OpenChannelEvent = OpenChannel;

export type CreateChannelEvent = CreateChannel.Init & {
  type: 'CREATE_CHANNEL';
};

export type ConcludeChannelEvent = ConcludeChannel.Init & {
  type: 'CONCLUDE_CHANNEL';
};

export { config };
export type Actions = {
  spawnJoinChannel: AssignAction<Init, OpenChannelEvent>;
  spawnCreateChannel: AssignAction<Init, CreateChannelEvent>;
  spawnConcludeChannel: AssignAction<Init, ConcludeChannelEvent>;
  updateStore: any; // TODO
};

export function machine(store: Store, context: Init) {
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
    return {
      ...ctx,
      processes: ctx.processes.concat([walletProcess]),
    };
  });

  const spawnConcludeChannel = assign((ctx: Init, { channelId }: ConcludeChannelEvent) => {
    const processId = `conclude-${channelId}`;
    if (ctx.processes.find(p => p.id === processId)) {
      throw new Error('Process exists');
    }

    const concludeChannelMachine = ConcludeChannel.machine(store, { channelId });
    const walletProcess: Process = {
      id: processId,
      ref: spawn(concludeChannelMachine, processId),
    };
    return {
      ...ctx,
      processes: ctx.processes.concat([walletProcess]),
    };
  });

  const updateStore = (_, { signedStates }: SendStates) => store.receiveStates(signedStates);

  const options: { actions: Actions } = {
    actions: {
      spawnCreateChannel,
      spawnJoinChannel,
      spawnConcludeChannel,
      updateStore,
    },
  };

  return Machine(config).withConfig(options, context);
}
