import {Machine, StateNodeConfig} from 'xstate';
import {Store} from '../store';
import {SupportState} from '.';
import {getDataAndInvoke, checkThat} from '../utils';
import {outcomesEqual} from '../store/state-utils';
import {State, BudgetItem} from '../store/types';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {isSimpleEthAllocation} from '../utils/outcome';

const WORKFLOW = 'conclude-channel';

export type Init = {channelId: string};

const finalState = (store: Store) => async (context: Init): Promise<SupportState.Init> => {
  const {sortedStates, latestSupportedByMe, latest} = await store.getEntry(context.channelId);

  const latestFinalState: State | undefined = sortedStates.filter(s => s.isFinal)[0];

  // If we've received a new final state that matches our outcome we support that
  if (outcomesEqual(latestSupportedByMe.outcome, latestFinalState?.outcome)) {
    return {state: latestFinalState};
  }

  // If we've supported a final state, send it
  if (latestSupportedByMe.isFinal) {
    return {state: latestSupportedByMe};
  }

  // Otherwise create a new final state
  return {state: {...latestSupportedByMe, turnNum: latest.turnNum.add(1), isFinal: true}};
};

const supportState = (store: Store) => SupportState.machine(store);

const concludeChannel = getDataAndInvoke<Init>(
  {src: finalState.name},
  {src: supportState.name},
  'determineFundingType'
);

const determineFundingType = {
  invoke: {src: 'getFunding'},
  on: {
    VIRTUAL: 'virtual',
    DIRECT: 'withdraw'
  }
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
    asLeaf: {invoke: {src: 'virtualDefundingAsLeaf', onDone: 'success'}},
    asHub: {invoke: {src: 'virtualDefundingAsHub', onDone: 'success'}},
    success: {type: 'final' as 'final'}
  },
  onDone: 'freeingBudget'
};

const freeBudget = (store: Store) => async (ctx: Init) => {
  const {applicationSite, supported, myIndex} = await store.getEntry(ctx.channelId);
  if (!applicationSite) throw 'No site found';

  const items = checkThat(supported.outcome, isSimpleEthAllocation).allocationItems;
  if (items.length !== 2) {
    throw new Error('Unexpected number of allocation items');
  }

  const {participants} = supported;
  const outcomeIdx = items.findIndex(
    item => item.destination === participants[myIndex].destination
  );

  const inUse: BudgetItem = {
    playerAmount: items[outcomeIdx].amount,
    hubAmount: items[1 - outcomeIdx].amount
  };

  await store.releaseFunds(applicationSite, [
    {assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, inUse}
  ]);
};

const freeingBudget = {invoke: {src: freeBudget.name, onDone: 'done'}};

const virtual: StateNodeConfig<Init, any, any> = {
  initial: 'virtualDefunding',
  states: {virtualDefunding, freeingBudget, done: {type: 'final'}},
  onDone: 'success'
};

const withdraw = {};

export const config: StateNodeConfig<Init, any, any> = {
  key: WORKFLOW,
  initial: 'concludeChannel',
  states: {
    concludeChannel,
    determineFundingType,
    virtual,
    withdraw,
    success: {type: 'final' as 'final'}
  }
};

export const mockOptions = {guards: {virtuallyFunded: _ => true, directlyFunded: _ => true}};

const services = (store: Store) => ({
  finalState: finalState(store),
  supportState: supportState(store)
});
const options = (store: Store) => ({services: services(store)});
export const machine = (store: Store) => Machine(config).withConfig(options(store));
