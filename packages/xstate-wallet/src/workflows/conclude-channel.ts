import {Machine} from 'xstate';
import * as SupportState from './support-state';
import {getDataAndInvoke, MachineFactory} from '../utils/workflow-utils';
import {Store} from '../store';
import {outcomesEqual} from '../store/state-utils';
import {isIndirectFunding} from '../store/memory-store';
import {add} from '../utils/math-utils';
import {checkThat} from '../utils';
import {isSimpleEthAllocation, simpleEthAllocation} from '../utils/outcome';
const WORKFLOW = 'conclude-channel';

export interface Init {
  channelId: string;
}
// TODO:Currently this is hard coded to go to done after the state is concluded
// We need to support various funding type options here
const determineFundingType = {on: {'': 'success'}};

const concludeTarget = {
  ...getDataAndInvoke('getFinalState', 'supportState', 'determineFundingType')
};
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
    determineFundingType,
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
        turnNum: latestSupportedByMe.turnNum.add(1),
        isFinal: true
      }
    };
  }

  async function getDefundedLedgerState({channelId}: Init): Promise<SupportState.Init> {
    const funding = checkThat((await store.getEntry(channelId)).funding, isIndirectFunding);
    const {supported: targetChannelState} = await store.getEntry(channelId);
    const {outcome: concludedOutcome} = targetChannelState;
    if (!targetChannelState.isFinal) throw 'Target channel not finalized';

    const {supported: ledgerState, channelConstants} = await store.getEntry(funding.ledgerId);
    if (!isSimpleEthAllocation(ledgerState.outcome) || !isSimpleEthAllocation(concludedOutcome)) {
      throw new Error('Only SimpleEthAllocations are currently supported');
    }
    const allocation = ledgerState.outcome.allocationItems;
    const idx = allocation.findIndex(({destination}) => destination === channelId);

    if (
      ledgerState.outcome.allocationItems[idx]?.amount !==
      concludedOutcome.allocationItems.map(a => a.amount).reduce(add)
    ) {
      // TODO: What should we do here?
      throw 'Target channel underfunded';
    }

    allocation.splice(idx, 1).push(...concludedOutcome.allocationItems);

    return {
      state: {
        ...channelConstants,
        ...ledgerState,
        turnNum: ledgerState.turnNum.add(1),
        outcome: simpleEthAllocation(allocation)
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
