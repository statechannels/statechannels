import {
  AnyEventObject,
  assign,
  AssignAction,
  Machine,
  spawn,
  State,
} from 'xstate';
import { CreateChannel, JoinChannel } from '..';
import { getChannelID, pretty, Store } from '../..';
import { OpenChannel } from '../../wire-protocol';

const PROTOCOL = 'wallet';
export type Process = {
  id: string;
  ref: any;
};
export interface Init {
  id: string;
  processes: Process[];
}

function forwardToChildren(
  _ctx,
  event: AnyEventObject,
  { state }: { state: State<any, any, any> }
) {
  state.context.processes.forEach(({ ref }: Process) => ref.send(event));
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
        '*': { actions: forwardToChildren },
        // CHANNEL_UPDATED: {
        //   actions: [forwardToChildren],
        // },
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

export function machine(store: Store) {
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
  const options: { actions: any } = {
    actions: {
      spawnCreateChannel,
      spawnJoinChannel,
      forwardToChildren,
    },
  };
  return Machine(config, options);
}
