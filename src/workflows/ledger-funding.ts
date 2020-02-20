import {Machine, MachineConfig, ServiceConfig} from 'xstate';

import {SupportState} from '.';
import {Store} from '../store';
import {allocateToTarget} from '../utils/outcome';
import {AllocationItem} from '../store/types';
import {getDataAndInvoke} from '../utils';

const WORKFLOW = 'ledger-funding';

export interface Init {
  targetChannelId: string;
  ledgerChannelId: string;
  deductions: AllocationItem[];
}

type TODO = any; // TODO
const fundLedger = {
  invoke: {
    src: 'directFunding',
    data: ({ledgerChannelId, deductions}: Init): TODO => ({
      channelId: ledgerChannelId,
      minimalAllocation: deductions
    }),
    onDone: 'fundTarget'
  }
};
const FAILURE = `#${WORKFLOW}.failure`;
const fundTarget = getDataAndInvoke(
  {src: 'getTargetOutcome'},
  {src: 'supportState', opts: {onError: FAILURE}},
  'updateFunding'
);
const updateFunding = {invoke: {src: 'updateFunding', onDone: 'success'}};

export const config: MachineConfig<any, any, any> = {
  key: WORKFLOW,
  initial: 'fundLedger',
  states: {
    fundLedger,
    fundTarget,
    updateFunding,
    success: {type: 'final'},
    failure: {}
  }
};

const enum Services {
  directFunding = 'directFunding',
  getTargetOutcome = 'getTargetOutcome',
  updateFunding = 'updateFunding',
  supportState = 'supportState'
}

export const machine = (store: Store, context: Init) => {
  async function getTargetOutcome({
    targetChannelId,
    ledgerChannelId,
    deductions
  }: Init): Promise<SupportState.Init> {
    // TODO: Switch to feed
    const {latest: ledgerState, channelConstants} = await store.getEntry(ledgerChannelId);

    return {
      state: {
        ...channelConstants,
        ...ledgerState,
        turnNum: ledgerState.turnNum.add(1),
        outcome: allocateToTarget(ledgerState.outcome, deductions, targetChannelId)
      }
    };
  }

  const services: Record<Services, ServiceConfig<Init>> = {
    directFunding: () => Promise.resolve(), // TODO
    getTargetOutcome,
    updateFunding: () => Promise.resolve(), // TODO
    supportState: SupportState.machine(store)
  };

  return Machine(config).withConfig({services}, context);
};
