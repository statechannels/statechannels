import { Machine, MachineConfig, send, SendAction, sendParent } from 'xstate';
import { AdvanceChannel, Funding, JoinChannel } from '..';
import { forwardChannelUpdated, MachineFactory, Store, success } from '../..';
import { JsonRpcJoinChannelParams } from '../../json-rpc';
import { ChannelUpdated } from '../../store';
import { CloseChannel, OpenChannel } from '../../wire-protocol';
import { OpenChannelEvent } from '../wallet/protocol';

const PROTOCOL = 'join-channel';

/*
Spawned in a new process when the app calls JoinChannel
*/
export type Init = JsonRpcJoinChannelParams;

// I should ask my channel store if the channel nonce is ok
const checkNonce = {
  on: {
    OPEN_CHANNEL: {
      target: 'askClient',
      cond: 'nonceOk',
    },
  },
  exit: 'storeState',
};

const askClient = {
  invoke: {
    src: 'askClient',
    onDone: [
      {
        target: 'preFundSetup',
        cond: ({}, event) => event.data === 'JOIN_CHANNEL',
      },
      { target: 'abort', cond: ({}, event) => event.data === 'CLOSE_CHANNEL' },
    ],
  },
};

const abort = {
  entry: 'sendCloseChannel',
  type: 'final' as 'final',
};

const advanceChannelArgs = n => ({ channelId }: Init) => ({
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
const passChannelId = ({ channelId }: Init) => ({ channelId });
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

export const config: MachineConfig<
  Init,
  any,
  OpenChannel | CloseChannel | ChannelUpdated
> = {
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

export const mockOptions: { guards: Guards } = {
  guards: { nonceOk: () => true },
};
export type Guards = {
  nonceOk: ({  }: Init, event: OpenChannelEvent) => boolean;
};
export type Services = {
  askClient: any;
  funding: any;
  advanceChannel: any;
};
export type Actions = {
  storeState({ channelId }: Init, { signedState }: OpenChannel): void;
  sendCloseChannel({ channelId }: Init): void;
};

export const machine: MachineFactory<Init, any> = (
  store: Store,
  { channelId }: JoinChannel.Init
) => {
  const guards: Guards = {
    nonceOk: ({}, event: OpenChannelEvent) => {
      const { channel } = event.signedState.state;
      return store.nonceOk(channel.participants, channel.channelNonce);
    },
  };
  const actions: Actions = {
    storeState: ({  }: Init, { signedState }: OpenChannel) => {
      store.receiveStates([signedState]);
    },
    sendCloseChannel: () => {
      console.log('TODO: Send close channel');
    },
  };

  const services: Services = {
    askClient: async () => 'JOIN_CHANNEL',
    funding: Funding.machine(store),
    advanceChannel: AdvanceChannel.machine(store),
  };
  const options = {
    guards,
    actions,
    services,
  };

  const context = { channelId };
  return Machine(config, options).withConfig(options, context);
};
