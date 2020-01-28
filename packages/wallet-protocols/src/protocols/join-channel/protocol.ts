import { Machine, MachineConfig, sendParent, assign, DoneInvokeEvent } from 'xstate';
import { getChannelId } from '@statechannels/nitro-protocol';

import { forwardChannelUpdated, MachineFactory, Store } from '../..';
import { ChannelUpdated } from '../../store';
import { CloseChannel, OpenChannel } from '../../wire-protocol';
import { OpenChannelEvent } from '../wallet/protocol';

import { AdvanceChannel, Funding, JoinChannel } from '..';

const PROTOCOL = 'join-channel';

/*
Spawned in a new process when the app calls JoinChannel
*/
export type Init = OpenChannelEvent;
type Context = Init & { channelId: string };

// I should ask my channel store if the channel nonce is ok
const checkNonce = {
  invoke: {
    src: 'checkNonce',
    onDone: [
      {
        target: 'askClient',
        cond: (_, { data }: DoneInvokeEvent<boolean>) => data,
      },
    ],
  },
  exit: [
    assign(
      (ctx: Init): Context => ({
        ...ctx,
        channelId: getChannelId(ctx.signedState.state.channel),
      })
    ),
  ],
};

const askClient = {
  invoke: {
    src: 'askClient',
    onDone: [
      {
        target: 'preFundSetup',
        cond: (_, event) => event.data === 'JOIN_CHANNEL',
      },
      { target: 'abort', cond: (_, event) => event.data === 'CLOSE_CHANNEL' },
    ],
  },
};

const abort = {
  entry: 'sendCloseChannel',
  type: 'final' as 'final',
};

const advanceChannelArgs = n => ({ channelId }: Context) => ({
  channelId,
  targetTurnNum: n,
});
const preFundSetup = {
  invoke: {
    id: 'preFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(1),
    onDone: 'funding',
  },
  on: {
    CHANNEL_UPDATED: forwardChannelUpdated<Init>('preFundSetup'),
  },
};
export const passChannelId: (c: Init) => Funding.Init = ({ channelId }: Context) => ({
  targetChannelId: channelId,
  tries: 0,
});

const funding = {
  invoke: {
    src: 'funding',
    data: passChannelId,
    onDone: 'postFundSetup',
  },
};

const postFundSetup = {
  invoke: {
    id: 'postFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(3),
    onDone: 'success',
  },
  on: {
    CHANNEL_UPDATED: forwardChannelUpdated<Init>('postFundSetup'),
  },
};

export const config: MachineConfig<Init, any, OpenChannel | CloseChannel | ChannelUpdated> = {
  key: PROTOCOL,
  initial: 'checkNonce',
  states: {
    checkNonce,
    askClient,
    abort,
    preFundSetup,
    funding,
    postFundSetup,
    success: { type: 'final' as 'final', entry: sendParent('CHANNEL_JOINED') },
  },
};

export type Services = {
  checkNonce(_: Init, event: OpenChannelEvent): Promise<boolean>;
  askClient: any;
  funding: any;
  advanceChannel: any;
};
export type Actions = {
  sendCloseChannel({ channelId }: Context): void;
};

export const machine: MachineFactory<Init, any> = (store: Store, ctx: Init) => {
  const actions: Actions = {
    sendCloseChannel: () => {
      console.log('TODO: Send close channel');
    },
  };

  const services: Services = {
    checkNonce: async ({ signedState, participants }: Init) => {
      const { channel } = signedState.state;
      if (store.nonceOk(channel.participants, channel.channelNonce)) {
        const privateKey = store.getPrivateKey(participants.map(p => p.signingAddress));
        store.initializeChannel({ participants, privateKey, states: [signedState], channel });
        return true;
      } else {
        return false;
      }
    },

    askClient: async () => 'JOIN_CHANNEL',
    funding: Funding.machine(store),
    advanceChannel: AdvanceChannel.machine(store),
  };
  const options = {
    actions,
    services,
  };

  return Machine(config, options).withConfig(options, ctx);
};
