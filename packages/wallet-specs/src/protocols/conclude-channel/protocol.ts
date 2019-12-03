import { State } from '../..';
import { store } from '../../store';
import { saveConfig } from '../../utils';
import * as LedgerDefunding from '../ledger-defunding/protocol';
import * as VirtualDefundingAsHub from '../virtual-defunding-as-hub/protocol';
import * as VirtualDefundingAsLeaf from '../virtual-defunding-as-leaf/protocol';

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
      target: 'virtualDefunding',
      cond: 'virtuallyFunded',
    },
    {
      target: 'success',
      cond: 'directlyFunded',
    },
    {
      target: 'ledgerDefunding',
      cond: 'indirectlyFunded',
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
    onDone: 'success',
  },
};

function virtualDefundingAsLeafArgs(ctx: Init): VirtualDefundingAsLeaf.Init {
  const targetChannelId = 'target';
  const index = 0;
  return {
    targetChannelId,
    index,
  };
}
function virtualDefundingAsHubArgs(ctx: Init): VirtualDefundingAsHub.Init {
  const jointChannelId = 'joint';
  return { jointChannelId };
}
const virtualDefunding = {
  initial: 'start',
  states: {
    start: {
      on: {
        '': [
          { target: 'asLeaf', cond: 'amLeaf' },
          { target: 'asHub', cond: 'amHub' },
        ],
      },
    },
    asLeaf: {
      invoke: {
        src: 'virtualDefundingAsLeaf',
        data: virtualDefundingAsLeafArgs.name,
        onDone: 'success',
      },
    },
    asHub: {
      invoke: {
        src: 'virtualDefundingAsHub',
        data: virtualDefundingAsHubArgs.name,
        onDone: 'success',
      },
    },
    success: { type: 'final' },
  },
  onDone: 'success',
};

const config = {
  key: PROTOCOL,
  initial: 'concludeTarget',
  states: {
    concludeTarget,
    virtualDefunding,
    ledgerDefunding,
    success: { type: 'final' },
  },
};

const guards = {
  virtuallyFunded: _ => true,
  indirectlyFunded: _ => true,
  directlyFunded: _ => true,
};

saveConfig(config, __dirname, { guards });
