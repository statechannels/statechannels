import { assign, Machine } from 'xstate';
import { SupportState } from '..';
import {
  Channel,
  FINAL,
  getChannelId,
  MachineFactory,
  Outcome,
  SignedState,
} from '../../';
import { ChannelStoreEntry } from '../../ChannelStoreEntry';
import { Participant } from '../../store';

const PROTOCOL = 'create-null-channel';
/*
Creating a null-channel seems sufficiently different from creating an app channel
that it's worth having its own protocol.

The differences are:
- it's the responsibility of the parent protocol to provide the nonce
- creating a null channel is symmetric; all participants sign the same preFundSetup state
- create-null-channel is not responsible for funding the channel

These differences allow create-null-channel to be fully-determined.
*/

export interface Init {
  channel: Channel;
  outcome: Outcome;
}

// For convenience, assign the channel id
type Context = Init & { channelId: string };

const checkChannel = {
  invoke: {
    src: 'checkChannel',
    onDone: {
      target: 'preFundSetup',
      actions: assign((ctx: Init) => ({
        ...ctx,
        channelId: getChannelId(ctx.channel),
      })),
    },
  },
};

function preFundData({ channelId, outcome }: Context): SupportState.Init {
  return {
    channelId,
    outcome,
  };
}
const preFundSetup = {
  invoke: {
    src: 'supportState',
    data: preFundData,
    onDone: 'success',
    autoForward: true,
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'checkChannel',
  states: {
    checkChannel,
    preFundSetup,
    success: {
      type: FINAL,
      data: ({ channelId }: Context) => ({ channelId }),
    },
  },
};

export const machine: MachineFactory<Init, any> = (store, context: Init) => {
  async function checkChannelService({
    channel,
    outcome,
  }: Init): Promise<boolean> {
    // TODO: Should check that
    // - the nonce is used,
    // - that we have the private key for one of the signers, etc

    // TODO: Use the correct participant ids
    const participants: Participant[] = channel.participants.map(p => ({
      destination: p,
      participantId: p,
      signingAddress: p,
    }));
    const privateKey = store.getPrivateKey(
      participants.map(p => p.participantId)
    );
    const unsupportedStates: SignedState[] = [
      {
        state: {
          turnNum: 0,
          outcome,
          channel,
          isFinal: false,
          challengeDuration: '1',
        },
        signatures: [],
      },
    ];
    store.initializeChannel(
      new ChannelStoreEntry({
        channel,
        privateKey,
        participants,
        unsupportedStates,
      })
    );

    return true;
  }

  const services = {
    checkChannel: checkChannelService,
    supportState: SupportState.machine(store),
  };

  const options = { services };
  return Machine(config, options).withContext(context);
};
