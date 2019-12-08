import {
  AnyEventObject,
  assign,
  AssignAction,
  Machine,
  spawn,
  State,
} from 'xstate';
import { CreateChannel, JoinChannel } from '..';
import { getChannelID, Store } from '../..';
import { OpenChannel } from '../../wire-protocol';

const PROTOCOL = 'wallet';
export type Process = {
  id: string;
  ref: any;
};
export interface Init {
  processes: Process[];
}

function forwardToChildren(
  _ctx,
  event: AnyEventObject,
  { state }: { state: State<any, any, any> }
) {
  Object.values(state.children).forEach(child => child.send(event));
}
const config = {
  key: PROTOCOL,
  initial: 'running',
  // context: { processes: [] },
  states: {
    running: {
      on: {
        OPEN_CHANNEL: { actions: 'spawnJoinChannel' },
        CREATE_CHANNEL: { actions: 'spawnCreateChannel' },
        '*': { actions: forwardToChildren },
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
};

export type Events = OpenChannelEvent & CreateChannelEvent;

export function machine(store: Store) {
  const spawnCreateChannel = assign(
    (ctx: Init, { type, ...init }: CreateChannelEvent): Init => {
      const processId = `create-channel`;
      if (ctx.processes.find(p => p.id === processId)) {
        throw new Error('Process exists');
      }

      const process = {
        id: processId,
        ref: spawn(
          CreateChannel.machine(store, init).withContext(init),
          processId
        ),
      };

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
    const process = {
      id: channelId,
      ref: spawn(JoinChannel.machine(store, { channelId }), processId),
    };
    return {
      ...ctx,
      processes: ctx.processes.concat([process]),
    };
  });
  const options: { actions: any } = {
    actions: {
      spawnCreateChannel,
      spawnJoinChannel,
      forwardToChildren,
    },
  };
  return Machine(config, options);
}
