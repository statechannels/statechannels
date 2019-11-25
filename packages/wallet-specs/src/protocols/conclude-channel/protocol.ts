import { State } from '../..';
import { store } from '../../store';
import { saveConfig } from '../../utils';

const PROTOCOL = 'conclude-channel';

interface Init {
  channelID: string;
}

function finalState({ channelID }: Init): State {
  // Only works for wallet channels
  // (and even doesn't really work reliably there)
  const latestState = store
    .getUnsupportedStates(channelID)
    .concat(store.getLatestConsensus(channelID))
    .filter(({ state }) => store.signedByMe(state))
    .sort(({ state }) => state.turnNum)
    .pop();

  if (!latestState) {
    throw new Error('No state');
  }

  return {
    ...latestState.state,
    turnNum: latestState.state.turnNum + 1,
    isFinal: true,
  };
}

const waiting = {
  invoke: {
    src: 'supportState',
    data: 'finalState',
  },
  onDone: 'success',
};

const config = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' },
  },
};

const guards = {};

saveConfig(config, __dirname, { guards });
