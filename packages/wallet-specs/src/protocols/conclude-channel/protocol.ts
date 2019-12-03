import { State } from '../..';
import { store } from '../../store';
import { saveConfig } from '../../utils';
import * as LedgerDefunding from '../ledger-defunding/protocol';

const PROTOCOL = 'conclude-channel';

export interface Init {
  channelId: string;
}

function finalState({ channelId }: Init): State {
  // Only works for wallet channels
  // (and even doesn't really work reliably there)
  const latestState = store
    .getUnsupportedStates(channelId)
    .concat(store.getLatestConsensus(channelId))
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

const concludeTarget = {
  invoke: {
    src: 'supportState',
    data: finalState.name,
  },
  onDone: [
    {
      target: 'ledgerDefunding',
      cond: 'indirectlyFunded',
    },
    {
      target: 'virtualDefunding',
      cond: 'virtuallyFunded',
    },
    {
      target: 'success',
      cond: 'directlyFunded',
    },
  ],
};

function ledgerDefundingArgs({ channelId }: Init): LedgerDefunding.Init {
  return { targetChannelId: channelId };
}
const ledgerDefunding = {
  invoke: {
    src: 'ledgerDefunding',
    data: ledgerDefundingArgs.name,
  },
};

function virtualDefundingArgs(ctx: Init): void {
  // TODO
}
const virtualDefunding = {
  invoke: {
    src: 'virtualDefunding',
    data: virtualDefundingArgs.name,
  },
};

const config = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    concludeTarget,
    ledgerDefunding,
    virtualDefunding,
    success: { type: 'final' },
  },
};

const guards = {
  virtuallyFunded: _ => true,
  indirectlyFunded: _ => true,
  directlyFunded: _ => true,
};

saveConfig(config, __dirname, { guards });
