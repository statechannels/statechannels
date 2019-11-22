import { ChannelState } from '../..';
import { store } from '../../store';
import { saveConfig } from '../../utils';

const PROTOCOL = 'support-state';

export interface Init {
  channelID: string;
  state: ChannelState;
}

function supported({ channelID, state }: Init): boolean {
  const { state: supportedState } = store.getLatestWalletChannelSupport(
    channelID
  );
  return store.equals(state, supportedState);
}

function sendState({ channelID, state }: Init): void {
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
