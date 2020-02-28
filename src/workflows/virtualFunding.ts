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
import {filter, map, take, flatMap, tap} from 'rxjs/operators';

import {Store, supportedStateFeed} from '../store/memory-store';
import {SupportState, LedgerFunding} from '.';
import {isFundGuarantor, FundGuarantor} from '../store/wire-protocol';
import {checkThat, getDataAndInvoke} from '../utils';
import {isSimpleEthAllocation, simpleEthAllocation, simpleEthGuarantee} from '../utils/outcome';
import {bigNumberify} from 'ethers/utils';
import {CHALLENGE_DURATION} from '../constants';
import _ from 'lodash';

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

  const ledgerChannelId = 'foo';

  const {channelId: guarantorId} = await store.createChannel(participants, CHALLENGE_DURATION, {
    turnNum: bigNumberify(0),
    appData: '0x',
    isFinal: false,
    outcome: simpleEthGuarantee(jointChannelId, ...participants.map(p => p.destination))
  });
  return {type: 'FundGuarantor', participants, jointChannelId, ledgerChannelId, guarantorId};
};

type TEvent = AnyEventObject;

const enum Actions {
  spawnFundGuarantorObserver = 'spawnFundGuarantorObserver',
  triggerGuarantorObjective = 'triggerGuarantorObjective'
}

const enum States {
  setupJointChannel = 'setupJointChannel',
  fundJointChannel = 'fundJointChannel',
  fundTargetChannel = 'fundTargetChannel',
  failure = '#workflow.failure',
  success = 'success'
}

const enum Services {
  waitForFirstJointState = 'waitForFirstJointState',
  jointChannelUpdate = 'jointChannelUpdate',
  supportState = 'supportState',
  ledgerFunding = 'ledgerFunding',
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
            invoke: {
              src: Services.ledgerFunding,
              data: (_, {guarantorId, ledgerChannelId}: FundGuarantor): LedgerFunding.Init => ({
                targetChannelId: guarantorId,
                ledgerChannelId,
                deductions: []
              }),
              onDone: 'done'
            }
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
              src: Services.ledgerFunding,
              data: (_, {data}: DoneInvokeEvent<FundGuarantor>): LedgerFunding.Init => ({
                targetChannelId: data.guarantorId,
                ledgerChannelId: data.ledgerChannelId,
                deductions: []
              }),
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
  id: 'workflow',
  initial: States.setupJointChannel,
  states: {
    [States.setupJointChannel]: getDataAndInvoke<Init, Services>(
      {src: Services.waitForFirstJointState, opts: {onError: '#workflow.failure'}},
      {src: Services.supportState},
      States.fundJointChannel
    ),
    [States.fundJointChannel]: fundJointChannel(role),
    [States.fundTargetChannel]: getDataAndInvoke(
      {src: Services.jointChannelUpdate},
      {src: Services.supportState},
      States.success
    ),
    success: {type: 'final'},
    failure: {}
  }
});

export const config = generateConfig(Role.Hub);

const waitForFirstJointState = (store: Store) => ({
  jointChannelId
}: Init): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(jointChannelId)
    .pipe(
      flatMap(e => e.states),
      filter(({turnNum}) => turnNum.eq(0)),
      tap(({outcome, participants}) => {
        const {allocationItems} = checkThat(outcome, isSimpleEthAllocation);
        const destinations = allocationItems.map(i => i.destination);
        const amounts = allocationItems.map(i => i.amount);

        if (
          destinations[0] === participants[0].destination &&
          destinations[1] === participants[2].destination &&
          destinations[2] === participants[1].destination &&
          amounts[0].add(amounts[1]).eq(amounts[2])
        ) {
          return;
        } else throw 'Invalid first state';
      }),
      map(s => ({state: s})),
      take(1)
    )
    .toPromise();

const spawnFundGuarantorObserver = (store: Store) => ({jointChannelId}: Init) =>
  spawn(
    store.newObjectiveFeed.pipe(
      filter(isFundGuarantor),
      filter(o => o.jointChannelId === jointChannelId),
      take(1)
    )
  );

const jointChannelUpdate = (store: Store) => ({
  jointChannelId,
  targetChannelId
}: Init): Promise<SupportState.Init> =>
  supportedStateFeed(store, jointChannelId)
    .pipe(
      filter(({state}) => state.turnNum.eq(0)),
      map(({state}) => {
        const oldOutcome = checkThat(state.outcome, isSimpleEthAllocation);
        const amount = oldOutcome.allocationItems[2].amount;
        const outcome = simpleEthAllocation(
          {destination: targetChannelId, amount},
          {destination: state.participants[Role.Hub].destination, amount}
        );
        return {state: {...state, turnNum: bigNumberify(1), outcome}};
      }),
      take(1)
    )
    .toPromise();

export const options = (store: Store): Partial<MachineOptions<Init, TEvent>> => {
  const actions: Record<Actions, any> = {
    [Actions.spawnFundGuarantorObserver]: assign<any>({
      guarantorObserver: spawnFundGuarantorObserver(store)
    }),
    [Actions.triggerGuarantorObjective]: (_, {data}: DoneInvokeEvent<FundGuarantor>) =>
      store.addObjective(data)
  };

  const services: Record<Services, ServiceConfig<Init>> = {
    supportState: SupportState.machine(store as any),
    ledgerFunding: LedgerFunding.machine(store),
    waitForFirstJointState: waitForFirstJointState(store),
    jointChannelUpdate: jointChannelUpdate(store),
    fundGuarantorAH: getObjective(store, Role.A),
    fundGuarantorBH: getObjective(store, Role.B)
  };

  return {actions, services};
};

export const machine = (store: Store, context: Init, role: Role) =>
  Machine(generateConfig(role), options(store)).withContext(context);
