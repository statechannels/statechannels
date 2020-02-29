import {Machine} from 'xstate';
import * as SupportState from './support-state';
import {getDataAndInvoke, MachineFactory} from '../utils/workflow-utils';
import {Store} from '../store';
import {outcomesEqual} from '../store/state-utils';
import {isIndirectFunding} from '../store/memory-store';
import {checkThat} from '../utils';
import {add} from '../utils/hex-number-utils';
const WORKFLOW = 'conclude-channel';

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
          {target: 'asLeaf', cond: 'amLeaf'},
          {target: 'asHub', cond: 'amHub'}
        ]
      }
    },
    asLeaf: {
      invoke: {
        src: 'virtualDefundingAsLeaf',
        onDone: 'success'
      }
    },
    asHub: {
      invoke: {
        src: 'virtualDefundingAsHub',
        onDone: 'success'
      }
    },
    success: {type: 'final' as 'final'}
  },
  onDone: 'success'
};

export const config = {
  key: WORKFLOW,
  initial: 'concludeTarget',
  states: {
    concludeTarget,
    virtualDefunding,
    ledgerDefunding,
    success: {type: 'final' as 'final'}
  }
};

export const mockOptions = {
  guards: {
    virtuallyFunded: _ => true,
    indirectlyFunded: _ => true,
    directlyFunded: _ => true
  }
};

export const machine: MachineFactory<Init, any> = (store: Store, ctx: Init) => {
  async function getFinalState({channelId}: Init): Promise<SupportState.Init> {
    const {latestSupportedByMe, latest, channelConstants} = await store.getEntry(channelId);

    if (!latestSupportedByMe) {
      throw new Error('No state');
    }
    // If we've received a new final state that matches our outcome we support that
    if (latest.isFinal && outcomesEqual(latestSupportedByMe.outcome, latest.outcome)) {
      return {state: {...latest, ...channelConstants}};
    }
    // Otherwise send out our final state that we support
    if (latestSupportedByMe.isFinal) {
      return {state: {...latestSupportedByMe, ...channelConstants}};
    }
    // Otherwise create a new final state
    return {
      state: {
        ...channelConstants,
        ...latestSupportedByMe,
        turnNum: add(latestSupportedByMe.turnNum, 1),
        isFinal: true
      }
    };
  }

  async function getDefundedLedgerState({channelId}: Init): Promise<SupportState.Init> {
    const funding = checkThat((await store.getEntry(channelId)).funding, isIndirectFunding);
    const {supported: targetChannelSupported} = await store.getEntry(channelId);
    if (!targetChannelSupported) {
      throw new Error('No supported state for target channel');
    }
    const {outcome: concludedOutcome, isFinal} = targetChannelSupported;
    if (!isFinal) throw 'Target channel not finalized';

    const {supported, channelConstants} = await store.getEntry(funding.ledgerId);
    if (!supported) {
      throw new Error('No supported state for ledger channel');
    }
    if (
      supported.outcome.type !== 'SimpleEthAllocation' ||
      concludedOutcome.type !== 'SimpleEthAllocation'
    ) {
      throw new Error('Only SimpleEthAllocations are currently supported');
    }
    const allocation = supported.outcome.allocationItems;
    const idx = allocation.findIndex(({destination}) => destination === channelId);

    if (
      supported.outcome.allocationItems[idx]?.amount !==
      concludedOutcome.allocationItems.map(a => a.amount).reduce(add)
    ) {
      // TODO: What should we do here?
      throw 'Target channel underfunded';
    }

    allocation.splice(idx, 1).push(...concludedOutcome.allocationItems);

    return {
      state: {
        ...channelConstants,
        ...supported,
        turnNum: add(supported.turnNum, 1),
        outcome: {type: 'SimpleEthAllocation', allocationItems: allocation}
      }
    };
  }

  const services = {
    getFinalState,
    getDefundedLedgerState,
    supportState: SupportState.machine(store)
  };

  const options = {services};
  return Machine(config).withConfig(options, ctx);
};
