import { Machine } from 'xstate';

import * as VirtualDefundingAsHub from '../virtual-defunding-as-hub/protocol';
import * as VirtualDefundingAsLeaf from '../virtual-defunding-as-leaf/protocol';
import {
  MachineFactory,
  FINAL,
  checkThat,
  getEthAllocation,
  ethAllocationOutcome,
  add,
} from '../..';
import { IStore } from '../../store';
import { getDetaAndInvoke } from '../../machine-utils';
import { isIndirectFunding } from '../../ChannelStoreEntry';

import { SupportState } from '..';

const PROTOCOL = 'conclude-channel';

export interface Init {
  channelId: string;
}

const concludeTarget = getDetaAndInvoke('getFinalState', 'supportState', 'ledgerDefunding');
const ledgerDefunding = getDetaAndInvoke('getDefundedLedgerState', 'supportState', 'success');

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

  async function getDefundedLedgerState({ channelId }: Init): Promise<SupportState.Init> {
    const funding = checkThat(store.getEntry(channelId).funding, isIndirectFunding);

    const { outcome: concludedOutcome, isFinal } = store.getEntry(channelId).latestSupportedState;
    if (!isFinal) throw 'Target channel not finalized';

    const { latestSupportedState } = store.getEntry(funding.ledgerId);
    const allocation = getEthAllocation(latestSupportedState.outcome);
    const idx = allocation.findIndex(({ destination }) => destination === channelId);

    if (
      allocation[idx]?.amount !==
      getEthAllocation(concludedOutcome)
        .map(a => a.amount)
        .reduce(add)
    ) {
      // TODO: What should we do here?
      throw 'Target channel underfunded';
    }

    allocation.splice(idx, 1).push(...getEthAllocation(concludedOutcome));

    return {
      state: {
        ...latestSupportedState,
        turnNum: latestSupportedState.turnNum + 1,
        outcome: ethAllocationOutcome(allocation),
      },
    };
  }

  const services = {
    getFinalState,
    getDefundedLedgerState,
    supportState: SupportState.machine(store),
  };

  const options = { services };
  return Machine(config).withConfig(options, ctx);
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
