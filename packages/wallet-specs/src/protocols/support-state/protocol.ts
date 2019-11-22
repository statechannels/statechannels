import { ChannelState } from '../..';
import { saveConfig } from '../..//utils';
import { store } from '../../store';

const PROTOCOL = 'support-state';

interface Context {
  channelID: string;
  state: ChannelState;
}

function supported({ channelID, state }: Context): boolean {
  const { state: supportedState } = store.getLatestWalletChannelSupport(
    channelID
  );
  return store.equals(state, supportedState);
}

function sendState({ channelID, state }: Context): void {
  const unsupportedStates = store.getUnsupportedStates(channelID);

  unsupportedStates.map(({ state: unsupportedState }) => {
    if (
      store.signedByMe(unsupportedState) &&
      unsupportedState.outcome !== state.outcome
    ) {
      throw new Error('Unsafe to send');
    }
  });
  store.sendState(state);
}

const waiting = {
  entry: 'sendState',
  on: {
    CHANNEL_UPDATED: [
      {
        target: 'success',
        cond: 'supported',
      },
    ],
  },
};

const config = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' },
  },
};

const guards = {
  supported: 'context => true',
};

saveConfig({ ...config }, { guards });
