import { State } from '@statechannels/nitro-protocol';
import { Machine } from 'xstate';

import * as LedgerDefunding from '../ledger-defunding/protocol';
import * as VirtualDefundingAsHub from '../virtual-defunding-as-hub/protocol';
import * as VirtualDefundingAsLeaf from '../virtual-defunding-as-leaf/protocol';
import { MachineFactory, FINAL } from '../..';
import { IStore } from '../../store';
import { getDetaAndInvoke } from '../../machine-utils';

import { SupportState } from '..';

const PROTOCOL = 'conclude-channel';

export interface Init {
  channelId: string;
}

const concludeTarget = getDetaAndInvoke('getFinalState', 'supportState', 'success');

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

export const machine: MachineFactory<Init, any> = (store: IStore, ctx: Init) => {
  async function getFinalState({ channelId }: Init): Promise<SupportState.Init> {
    const latestState = store.getEntry(channelId).latestStateSupportedByMe;

    if (!latestState) {
      throw new Error('No state');
    }

    return {
      state: {
        ...latestState,
        turnNum: latestState.turnNum + 1,
        isFinal: true,
      },
    };
  }

  const services = {
    getFinalState,
    supportState: SupportState.machine(store),
  };

  const options = { services };
  return Machine(config).withConfig(options, ctx);
};
