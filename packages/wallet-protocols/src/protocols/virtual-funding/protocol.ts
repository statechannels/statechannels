import { Machine, MachineConfig, assign, spawn, DoneInvokeEvent } from 'xstate';
import { map, filter, take } from 'rxjs/operators';
import { Observable, forkJoin } from 'rxjs';
import _ from 'lodash';

import { Allocation, Outcome } from '@statechannels/nitro-protocol/src';

import { HashZero, AddressZero } from 'ethers/constants';

import { MachineFactory, getDataAndInvoke } from '../../machine-utils';
import { observeChannel, Store } from '../../store';
import { getEthAllocation, ethAllocationOutcome, ethGuaranteeOutcome } from '../../calculations';

import { add } from '../../mathOps';

import { SupportState } from '..';

const PROTOCOL = 'virtual-funding';

export type Init = {
  jointChannelId: string;
  targetChannelId: string;
  guarantorChannelIds: string[];
  targetAllocation: Allocation;
};

type StateSchema = {
  states: {
    preFundSetup;
    fundTarget: { states: { getWatcher; waitForGuarantee; funding; success } };
    success;
  };
};

const fundingArgs = (store: Store) => async (ctx: Init): Promise<SupportState.Init> => {
  const { latestSupportedState: jointState } = await store.getEntry(ctx.jointChannelId);

  const jointAllocation = getEthAllocation(jointState.outcome, store.ethAssetHolderAddress);
  const allocation: Allocation = [
    {
      destination: ctx.targetChannelId,
      amount: jointAllocation[1].amount,
    },
    jointAllocation[1],
  ];

  return {
    state: {
      ...jointState,
      turnNum: jointState.turnNum + 1,
      outcome: ethAllocationOutcome(allocation, store.ethAssetHolderAddress),
    },
  };
};

const supportState = (store: Store) => SupportState.machine(store);
type Watcher = Observable<'JOINT_CHANNEL_FUNDED'>;

const getWatcher = (store: Store) => async (ctx: Init): Promise<Watcher> => {
  const { participants: jointParticipants } = await store.getEntry(ctx.jointChannelId);

  const watchers: Observable<any>[] = ctx.guarantorChannelIds.map(guarantorId => {
    return observeChannel(store, guarantorId).pipe(
      filter(({ entry }) => {
        const clientIdx = jointParticipants
          .map(p => p.participantId)
          .indexOf(entry.participants[0].participantId);

        const expectedOutcome: Outcome = ethGuaranteeOutcome(
          {
            destinations: [
              ctx.targetChannelId,
              jointParticipants[clientIdx].destination,
              jointParticipants[1].destination,
            ],
            targetChannelId: ctx.jointChannelId,
          },
          store.ethAssetHolderAddress
        );

        return (
          entry.hasSupportedState && _.isEqual(entry.latestSupportedState.outcome, expectedOutcome)
        );
      }),
      take(1)
    );
  });

  return forkJoin(watchers).pipe(map(() => 'JOINT_CHANNEL_FUNDED'));
};

const initialJointState = (store: Store) => async ({
  targetAllocation,
  jointChannelId,
}: Init): Promise<SupportState.Init> => {
  const { participants, channel } = await store.getEntry(jointChannelId);

  const [leftAmount, rightAmount] = targetAllocation.map(i => i.amount);

  const outcome = ethAllocationOutcome(
    [
      {
        destination: participants[0].destination,
        amount: leftAmount,
      },
      {
        destination: participants[1].destination,
        amount: add(leftAmount, rightAmount),
      },
    ],
    store.ethAssetHolderAddress
  );

  return {
    state: {
      channel,
      challengeDuration: 0, // TODO
      turnNum: 0,
      outcome,
      isFinal: false,
      appData: HashZero,
      appDefinition: AddressZero,
    },
  };
};

type Services = {
  initialJointState(ctx: Init): Promise<SupportState.Init>;
  supportState: ReturnType<typeof SupportState.machine>;
  getWatcher(ctx: Init): Promise<Watcher>;
  fundingArgs(ctx: Init): Promise<SupportState.Init>;
};

export const config: MachineConfig<Init, StateSchema, any> = {
  key: PROTOCOL,
  initial: 'preFundSetup',
  states: {
    preFundSetup: getDataAndInvoke(initialJointState.name, 'supportState', 'fundTarget'),
    fundTarget: {
      initial: 'getWatcher',
      states: {
        getWatcher: { invoke: { src: 'getWatcher', onDone: 'waitForGuarantee' } },
        waitForGuarantee: {
          entry: assign<any>({
            watcher: (_, event: DoneInvokeEvent<Watcher>) => spawn(event.data),
          }),
          on: { JOINT_CHANNEL_FUNDED: 'funding' },
        },
        funding: getDataAndInvoke(fundingArgs.name, supportState.name, 'success'),
        success: { type: 'final' as 'final' },
      },
      onDone: 'success',
    },
    success: { type: 'final' as 'final' },
  },
};

export const machine: MachineFactory<Init, any> = (store: Store, init: Init) => {
  const services: Services = {
    initialJointState: initialJointState(store),
    fundingArgs: fundingArgs(store),
    supportState: supportState(store),
    getWatcher: getWatcher(store),
  };

  const options = { services };

  return Machine(config).withConfig(options, init);
};
