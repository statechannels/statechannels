import { assign } from 'xstate';
import { AdvanceChannel } from '..';
import { Channel, State, store } from '../..';
import { ChannelStoreEntry } from '../../ChannelStoreEntry';
import { JsonRpcCreateChannelParams } from '../../json-rpc';
import { saveConfig } from '../../utils';

const PROTOCOL = 'create-channel';

/*
Spawned in a new process when the app calls CreateChannel
*/
export type Init = JsonRpcCreateChannelParams;

type ChannelSet = Init & { channelId: string };
export const assignChannelId = assign(
  (ctx: Init): ChannelSet => {
    const participants = ctx.participants.map(p => p.destination);
    const channelNonce = store.getNextNonce(participants);
    const channel: Channel = {
      participants,
      channelNonce,
      chainId: 'mainnet?',
    };

    const { allocations: outcome, appData, appDefinition } = ctx;
    const firstState: State = {
      appData,
      appDefinition,
      isFinal: false,
      turnNum: 0,
      outcome,
      channel,
      challengeDuration: 'TODO', // TODO
    };

    const entry = new ChannelStoreEntry({
      channel,
      supportedState: [],
      unsupportedStates: [{ state: firstState, signatures: ['me'] }],
      privateKey: store.getPrivateKey(
        ctx.participants.map(p => p.participantId)
      ),
      participants: ctx.participants,
    });
    store.initializeChannel(entry.args);

    const { channelId } = entry;

    return { ...ctx, channelId };
  }
);

function advanceChannelArgs({ channelId }: ChannelSet): AdvanceChannel.Init {
  return {
    channelId,
    targetTurnNum: 1,
  };
}
const preFundSetup = {
  onEntry: [
    'assignChannelId', // This should generate a nonce, and assign `channelId` to the context
    'sendOpenChannelMessage',
  ],
  invoke: {
    src: 'advanceChannel',
    data: advanceChannelArgs.name,
    onDone: 'funding',
  },
  on: {
    CHANNEL_CLOSED: 'abort',
  },
};

const abort = {
  type: 'final',
};

const funding = {
  invoke: {
    src: 'funding',
    data: 'passChannelId',
  },
  onDone: 'postFundSetup',
};

const postFundSetup = {
  invoke: {
    src: 'advanceChannel',
    data: 'passChannelId',
  },
  onDone: 'success',
};

const config = {
  key: PROTOCOL,
  initial: 'chooseNonce',
  states: {
    preFundSetup,
    abort,
    funding,
    postFundSetup,
    success: { type: 'final' },
  },
};

export { config };

saveConfig(config, __dirname, { guards: {} });
