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
  return {type: 'FundGuarantor', participants, data: {jointChannelId, ledgerId, guarantorId}};
};

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
const enum Actions {
  spawnFundGuarantorObserver = 'spawnFundGuarantorObserver',
  triggerGuarantorObjective = 'triggerGuarantorObjective'
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
    case Role.B:
      config = {
        initial: 'waitForObjective',
        states: {
          waitForObjective: {
            entry: Actions.spawnFundGuarantorObserver,
            on: {FundGuarantor: 'runObjective'}
          },
          runObjective: {
            invoke: {src: Services.indirectFunding, data: (_, {init}) => init, onDone: 'done'}
          },
          done: {type: 'final'}
        }
      };
      break;
    case Role.Hub:
      const fundGuarantor = (objective: Services.fundGuarantorAH | Services.fundGuarantorBH) => ({
        initial: 'getObjective',
        states: {
          getObjective: {invoke: {src: objective, onDone: 'runObjective'}},
          runObjective: {
            entry: Actions.triggerGuarantorObjective,
            invoke: {
              src: Services.indirectFunding,
              data: (_, {data}: DoneInvokeEvent<FundGuarantor>) => data,
              onDone: 'done'
            }
          },
          done: {type: 'final'}
        }
      });

      config = {
        type: 'parallel',
        states: {
          fundGuarantorAH: fundGuarantor(Services.fundGuarantorAH),
          fundGuarantorBH: fundGuarantor(Services.fundGuarantorBH)
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

const spawnFundGuarantorObserver = (store: Store) => ({jointChannelId}: Init) =>
  spawn(
    store.newObjectiveFeed.pipe(
      filter(isFundGuarantor),
      filter(o => o.data.jointChannelId === jointChannelId),
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
    [Actions.spawnFundGuarantorObserver]: assign<any>({
      guarantorObserver: spawnFundGuarantorObserver(store)
    }),
    [Actions.triggerGuarantorObjective]: (_, {data}: DoneInvokeEvent<FundGuarantor>) => {
      store.sendMessage({objectives: [data]});
    }
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
