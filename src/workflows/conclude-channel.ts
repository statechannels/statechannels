import {Machine} from 'xstate';
import {getDataAndInvoke, MachineFactory} from '../utils/workflow-utils';
import {Store} from '../store';
import {outcomesEqual} from '../store/state-utils';
import {SupportState} from '.';

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
    determineFundingType,
    success: {type: 'final' as 'final'}
  }
};

export const mockOptions = {
  guards: {
    virtuallyFunded: _ => true,
    directlyFunded: _ => true
  }
};

export const machine: MachineFactory<Init, any> = (store: Store, ctx: Init) => {
  async function getFinalState({channelId}: Init): Promise<SupportState.Init> {
    const {latestSupportedByMe, latest} = await store.getEntry(channelId);

    // If we've received a new final state that matches our outcome we support that
    if (latest.isFinal && outcomesEqual(latestSupportedByMe.outcome, latest.outcome)) {
      return {state: latest};
    }
    // Otherwise send out our final state that we support
    if (latestSupportedByMe.isFinal) {
      return {state: latestSupportedByMe};
    }
    // Otherwise create a new final state
    return {
      state: {
        ...latestSupportedByMe,
        turnNum: latestSupportedByMe.turnNum.add(1),
        isFinal: true
      }
    };
  }

  const services = {
    getFinalState,
    supportState: SupportState.machine(store)
  };

  const options = {services};
  return Machine(config).withConfig(options, ctx);
};
