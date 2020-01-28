import { Machine } from 'xstate';

import * as VirtualDefundingAsHub from '../virtual-defunding-as-hub/protocol';
import * as VirtualDefundingAsLeaf from '../virtual-defunding-as-leaf/protocol';
import { MachineFactory, FINAL, checkThat, statesEqual, outcomesEqual } from '../..';
import { add } from '../../mathOps';
import { Store } from '../../store';
import { getDataAndInvoke } from '../../machine-utils';
import { isIndirectFunding } from '../../ChannelStoreEntry';
import { getEthAllocation, ethAllocationOutcome } from '../../calculations';

import { SupportState } from '..';

const PROTOCOL = 'conclude-channel';

export interface Init {
  channelId: string;
}

const concludeTarget = getDataAndInvoke('getFinalState', 'supportState', 'ledgerDefunding');
const ledgerDefunding = getDataAndInvoke('getDefundedLedgerState', 'supportState', 'success');

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

export const machine: MachineFactory<Init, any> = (store: Store, ctx: Init) => {
  async function getFinalState({ channelId }: Init): Promise<SupportState.Init> {
    const { latestStateSupportedByMe, latestState } = store.getEntry(channelId);

    if (!latestStateSupportedByMe) {
      throw new Error('No state');
    }
    // If we've received a new final state that matches our outcome we support that
    if (
      latestState.isFinal &&
      outcomesEqual(latestStateSupportedByMe.outcome, latestState.outcome)
    ) {
      return { state: latestState };
    }
    // Otherwise send out our final state that we support
    if (latestStateSupportedByMe.isFinal) {
      return { state: latestStateSupportedByMe };
    }
    // Otherwise create a new final state
    return {
      state: {
        ...latestStateSupportedByMe,
        turnNum: latestStateSupportedByMe.turnNum + 1,
        isFinal: true,
      },
    };
  }

  async function getDefundedLedgerState({ channelId }: Init): Promise<SupportState.Init> {
    const funding = checkThat(store.getEntry(channelId).funding, isIndirectFunding);

    const { outcome: concludedOutcome, isFinal } = store.getEntry(channelId).latestSupportedState;
    if (!isFinal) throw 'Target channel not finalized';

    const { latestSupportedState } = store.getEntry(funding.ledgerId);
    const allocation = getEthAllocation(latestSupportedState.outcome, store.ethAssetHolderAddress);
    const idx = allocation.findIndex(({ destination }) => destination === channelId);

    if (
      allocation[idx]?.amount !==
      getEthAllocation(concludedOutcome, store.ethAssetHolderAddress)
        .map(a => a.amount)
        .reduce(add)
    ) {
      // TODO: What should we do here?
      throw 'Target channel underfunded';
    }

    allocation
      .splice(idx, 1)
      .push(...getEthAllocation(concludedOutcome, store.ethAssetHolderAddress));

    return {
      state: {
        ...latestSupportedState,
        turnNum: latestSupportedState.turnNum + 1,
        outcome: ethAllocationOutcome(allocation, store.ethAssetHolderAddress),
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
