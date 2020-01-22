import { State } from '@statechannels/nitro-protocol';
import { Machine } from 'xstate';

import { store } from '../../temp-store';
import * as LedgerDefunding from '../ledger-defunding/protocol';
import * as VirtualDefundingAsHub from '../virtual-defunding-as-hub/protocol';
import * as VirtualDefundingAsLeaf from '../virtual-defunding-as-leaf/protocol';
import { MachineFactory, FINAL } from '../..';
import { IStore } from '../../store';

import { SupportState } from '..';

const PROTOCOL = 'conclude-channel';

export interface Init {
  channelId: string;
}

const concludeTarget = {
  invoke: {
    src: 'supportState',
    onDone: 'success',
  },
};

function ledgerDefundingArgs({ channelId }: Init): LedgerDefunding.Init {
  return { targetChannelId: channelId };
}
const ledgerDefunding = {
  invoke: {
    src: 'ledgerDefunding',
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
        onDone: 'success',
      },
    },
    asHub: {
      invoke: {
        src: 'virtualDefundingAsHub',
        onDone: 'success',
      },
    },
    success: { type: FINAL },
  },
  onDone: 'success',
};

export const config = {
  key: PROTOCOL,
  initial: 'concludeTarget',
  states: {
    concludeTarget,
    virtualDefunding,
    ledgerDefunding,
    success: { type: FINAL },
  },
};

export const mockOptions = {
  guards: {
    virtuallyFunded: _ => true,
    indirectlyFunded: _ => true,
    directlyFunded: _ => true,
  },
};

export const machine: MachineFactory<Init, any> = (_: IStore, ctx: Init) => {
  const services = {
    supportState: SupportState.machine(store),
  };
  return Machine(config).withConfig({}, ctx);
};

function finalState({ channelId }: Init): State {
  // Only works for wallet channels
  // (and even doesn't really work reliably there)
  const latestState = store
    .getEntry(channelId)
    .states.filter(({ state }) => store.signedByMe(state))
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
