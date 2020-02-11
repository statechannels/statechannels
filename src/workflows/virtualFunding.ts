import {
  StateNodeConfig,
  MachineConfig,
  assign,
  Machine,
  MachineOptions,
  AnyEventObject
} from 'xstate';

import {MemoryStore, Store} from '../store/memory-store';
import {SupportState} from '@statechannels/wallet-protocols';
import {toNitroState} from '../store/state-utils';

export const enum Role {
  A,
  Hub,
  B
}

export type Init = {
  targetChannelId: string;
  jointChannelId: string;
  role: Role;
};

function waitThenRunObjective<Objective extends string = string>(
  objective: Objective,
  src: string
): StateNodeConfig<any, any, any> {
  return {
    initial: 'waitForObjective',
    states: {
      waitForObjective: {entry: `spawn${objective}Observer`, on: {[objective]: 'runObjective'}},
      runObjective: {invoke: {src, data: (_, {init}) => init, onDone: 'done'}},
      done: {type: 'final'}
    }
  };
}

type TEvent = AnyEventObject;
type Objective = 'FundGuarantorAH' | 'FundGuarantorBH';
const enum Actions {
  spawnFundLedgerChannelObserver = 'spawnFundLedgerChannelObserver',
  triggerGuarantorObjectives = 'triggerGuarantorObjectives'
}
const enum States {
  setupJointChannel = 'setupJointChannel',
  fundJointChannel = 'fundJointChannel',
  fundTargetChannel = 'fundTargetChannel'
}

const fundJointChannel = (role: Role): StateNodeConfig<Init, any, TEvent> => {
  let config;
  switch (role) {
    case Role.A:
      config = waitThenRunObjective<Objective>('FundGuarantorAH', 'indirectFunding');
      break;
    case Role.B:
      config = waitThenRunObjective<Objective>('FundGuarantorBH', 'indirectFunding');
      break;
    case Role.Hub:
      config = {
        type: 'parallel',
        entry: Actions.triggerGuarantorObjectives,
        states: {
          fundGuarantorAH: waitThenRunObjective<Objective>('FundGuarantorAH', 'indirectFunding'),
          fundGuarantorBH: waitThenRunObjective<Objective>('FundGuarantorBH', 'indirectFunding')
        }
      };
  }

  return {...config, onDone: States.fundTargetChannel};
};

const generateConfig = (role: Role): MachineConfig<Init, any, any> => ({
  key: 'virtual-funding',
  initial: States.setupJointChannel,
  states: {
    [States.setupJointChannel]: {
      invoke: {src: 'supportState'},
      onDone: 'fundJointChannel'
    },
    [States.fundJointChannel]: fundJointChannel(role),
    [States.fundTargetChannel]: {invoke: {src: 'supportState'}, onDone: 'success'},
    success: {type: 'final'}
  }
});

export const config = generateConfig(Role.Hub);
export const startingJointState = (store: Store) => async ({
  jointChannelId
}: Init): Promise<SupportState.Init> => {
  const {latest, channelConstants} = await store.getEntry(jointChannelId);
  return {state: toNitroState({...latest, ...channelConstants})};
};

export const options = (store: MemoryStore): Partial<MachineOptions<Init, TEvent>> => {
  const actions: Record<Actions, any> = {
    [Actions.spawnFundLedgerChannelObserver]: assign<any>({
      ledgerObjectiveWatcher: 'TODO'
    }),
    [Actions.triggerGuarantorObjectives]: () => 'TODO'
  };

  return {actions};
};

export const machine = (store: MemoryStore, context: Init, role: Role) =>
  Machine(generateConfig(role), options(store)).withContext(context);
