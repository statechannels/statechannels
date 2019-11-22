import { saveConfig } from '../..//utils';
import { store } from '../../store';

const PROTOCOL = 'conclude-channel';

function supported(channelID: string): boolean {
  const { state } = store.getLatestWalletChannelSupport(channelID);
  return state.isFinal;
}

function sendFinalState(channelID: string): void {
  const { state: suppportedState } = store.getLatestWalletChannelSupport(
    channelID
  );
  const unsupportedStates = store.getUnsupportedStates(channelID);

  unsupportedStates.map(({ state }) => {
    if (store.signedByMe(state) && suppportedState.outcome !== state.outcome) {
      throw new Error('Unsafe to send final state');
    }
  });
  store.sendState({ ...suppportedState, isFinal: true });
}

const waiting = {
  entry: 'sendFinalState',
  on: {
    CHANNEL_UPDATED: [
      {
        target: 'success',
        cond: 'supported',
      },
    ],
  },
};

const advanceChannelConfig = {
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

saveConfig({ ...advanceChannelConfig }, { guards });

export { advanceChannelConfig };
