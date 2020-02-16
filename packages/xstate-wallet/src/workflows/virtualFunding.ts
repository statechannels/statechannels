import {
  StateNodeConfig,
  MachineConfig,
  assign,
  Machine,
  MachineOptions,
  AnyEventObject,
  DoneInvokeEvent,
  ServiceConfig,
  spawn
} from 'xstate';
import {filter, map, take} from 'rxjs/operators';

import {Store, supportedStateFeed} from '../store/memory-store';
import {State} from '../store/types';
import {SupportState} from '.';
import {ChannelStoreEntry} from '../store/memory-channel-storage';
import {isFundGuarantor, FundGuarantor} from '../store/wire-protocol';

export const enum Role {
  A = 0,
  Hub = 1,
  B = 2
}

export type Init = {
  targetChannelId: string;
  jointChannelId: string;
};

const getObjective = (store: Store, peer: Role.A | Role.B) => async ({
  jointChannelId
}: Init): Promise<FundGuarantor> => {
  const entry = await store.getEntry(jointChannelId);
  const {participants: jointParticipants} = entry.channelConstants;
  const participants = [jointParticipants[peer], jointParticipants[Role.Hub]];

  const ledgerId = 'foo';
  const guarantorId = 'bar';
  return {
    type: 'FundGuarantor',
    participants,
    data: {jointChannelId, ledgerId, guarantorId}
  };
};
function triggerThenRunObjective(peer: Role.A | Role.B) {
  const enum States {
    getObjective = 'getObjective',
    runObjective = 'runObjective'
  }
  const objective = peer === Role.A ? Services.fundGuarantorAH : Services.fundGuarantorBH;

  const config: StateNodeConfig<any, any, any> = {
    initial: States.getObjective,
    states: {
      [States.getObjective]: {invoke: {src: objective, onDone: States.runObjective}},
      [States.runObjective]: {
        invoke: {
          src: Services.indirectFunding,
          data: (_, {data}: DoneInvokeEvent<FundGuarantor>) => data,
          onDone: 'done'
        }
      },
      done: {type: 'final'}
    }
  };
  return config;
}

function waitThenRunObjective<O extends string = string>(
  objective: O,
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
function getDataAndInvoke<T>(
  data: string,
  src: string,
  onDone?: string,
  id?: string
): StateNodeConfig<T, any, DoneInvokeEvent<T>> {
  return {
    initial: data,
    states: {
      [data]: {invoke: {src: data, onDone: src}},
      [src]: {
        invoke: {
          id,
          src,
          data: (_, {data}: DoneInvokeEvent<T>) => data,
          onDone: 'done'
        }
      },
      done: {type: 'final'}
    },
    onDone
  };
}

type TEvent = AnyEventObject;
const enum VFObjective {
  FundGuarantorAH = 'FundGuarantorAH',
  FundGuarantorBH = 'FundGuarantorBH'
}
const enum Actions {
  spawnFundLedgerChannelObserver = 'spawnFundLedgerChannelObserver',
  spawnFundGuarantorAHObserver = 'spawnFundGuarantorAHObserver',
  spawnFundGuarantorBHObserver = 'spawnFundGuarantorBHObserver',
  triggerGuarantorObjectives = 'triggerGuarantorObjectives'
}
const enum States {
  setupJointChannel = 'setupJointChannel',
  fundJointChannel = 'fundJointChannel',
  fundTargetChannel = 'fundTargetChannel',
  success = 'success'
}

const enum Services {
  waitForFirstJointState = 'waitForFirstJointState',
  jointChannelUpdate = 'jointChannelUpdate',
  supportState = 'supportState',
  indirectFunding = 'indirectFunding',
  fundGuarantorAH = 'fundGuarantorAH',
  fundGuarantorBH = 'fundGuarantorBH'
}

const fundJointChannel = (role: Role): StateNodeConfig<Init, any, TEvent> => {
  let config;
  switch (role) {
    case Role.A:
      config = waitThenRunObjective<VFObjective>(
        VFObjective.FundGuarantorAH,
        Services.indirectFunding
      );
      break;
    case Role.B:
      config = waitThenRunObjective<VFObjective>(
        VFObjective.FundGuarantorBH,
        Services.indirectFunding
      );
      break;
    case Role.Hub:
      config = {
        type: 'parallel',
        entry: Actions.triggerGuarantorObjectives,
        states: {
          fundGuarantorAH: triggerThenRunObjective(Role.A),
          fundGuarantorBH: triggerThenRunObjective(Role.B)
        }
      };
  }

  return {...config, onDone: States.fundTargetChannel};
};

const generateConfig = (role: Role): MachineConfig<Init, any, any> => ({
  key: 'virtual-funding',
  initial: States.setupJointChannel,
  states: {
    [States.setupJointChannel]: getDataAndInvoke<Init>(
      Services.waitForFirstJointState,
      Services.supportState,
      States.fundJointChannel
    ),
    [States.fundJointChannel]: fundJointChannel(role),
    [States.fundTargetChannel]: getDataAndInvoke(
      Services.jointChannelUpdate,
      Services.supportState,
      States.success
    ),
    success: {type: 'final'}
  }
});

export const config = generateConfig(Role.Hub);
const waitForFirstJointState = (store: Store) => ({
  jointChannelId
}: Init): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(jointChannelId)
    .pipe(
      map((e: ChannelStoreEntry): State => ({...e.latest, ...e.channelConstants})),
      // TODO: This should also check that the first state is properly formed.
      // I think it's better to include the target allocation in the virtual-funding
      // init args, so that everyone can check the first state here.
      filter(s => s.turnNum.eq(0)),
      map(s => ({state: s})),
      take(1)
    )
    .toPromise();

const spawnFundGuarantorAHObserver = (store: Store) => ({jointChannelId}: Init) =>
  spawn(
    store.newObjectiveFeed.pipe(
      filter(isFundGuarantor),
      filter(o => o.data.jointChannelId === jointChannelId),
      map(o => ({...o, type: 'FundGuarantorAH'})),
      take(1)
    )
  );

const spawnFundGuarantorBHObserver = (store: Store) => ({jointChannelId}: Init) =>
  spawn(
    store.newObjectiveFeed.pipe(
      filter(isFundGuarantor),
      filter(o => o.data.jointChannelId === jointChannelId),
      map(o => ({...o, type: 'FundGuarantorBH'})),
      take(1)
    )
  );

const jointChannelUpdate = (store: Store) => ({jointChannelId}: Init): Promise<SupportState.Init> =>
  supportedStateFeed(store, jointChannelId)
    .pipe(
      filter(({state}) => state.turnNum.eq(0)),
      map(({state}) => ({
        state: {...state, turnNum: state.turnNum.add(1)}
      })),
      take(1)
    )
    .toPromise();

export const options = (store: Store): Partial<MachineOptions<Init, TEvent>> => {
  const actions: Record<Actions, any> = {
    [Actions.spawnFundLedgerChannelObserver]: () => {
      throw 'unimplemented';
    },
    [Actions.spawnFundGuarantorAHObserver]: assign<any>({
      guarantorAHObserver: spawnFundGuarantorAHObserver(store)
    }),
    [Actions.spawnFundGuarantorBHObserver]: assign<any>({
      guarantorBHObserver: spawnFundGuarantorBHObserver(store)
    }),
    [Actions.triggerGuarantorObjectives]: () => 'TODO'
  };

  const services: Record<Services, ServiceConfig<Init>> = {
    supportState: SupportState.machine(store as any),
    indirectFunding: async () => true,
    waitForFirstJointState: waitForFirstJointState(store),
    jointChannelUpdate: jointChannelUpdate(store),
    fundGuarantorAH: getObjective(store, Role.A),
    fundGuarantorBH: getObjective(store, Role.B)
  };

  return {actions, services};
};

export const machine = (store: Store, context: Init, role: Role) =>
  Machine(generateConfig(role), options(store)).withContext(context);
