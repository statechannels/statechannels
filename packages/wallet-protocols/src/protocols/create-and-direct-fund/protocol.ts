import { Machine, MachineConfig } from 'xstate';

import { AllocationAssetOutcome } from '@statechannels/nitro-protocol';

import { AddressZero } from 'ethers/constants';

import { MachineFactory } from '../../machine-utils';
import { ObsoleteStore } from '../..';

import { Participant } from '../../store';

import { getEthAllocation } from '../../calculations';

import { AdvanceChannel, DirectFunding } from '..';

const PROTOCOL = 'create-and-direct-fund';

export enum Indices {
  Left = 0,
  Right = 0,
}

export type Init = {
  participants: Participant[];
  allocations: AllocationAssetOutcome[];
  appDefinition: string;
  appData: string;
  channelId: string;
  challengeDuration: number;
  index: Indices;
};

export const advanceChannelArgs = (i: 1 | 3) => ({ channelId }: Init): AdvanceChannel.Init => ({
  channelId,
  targetTurnNum: i,
});

const constructFirstState = {
  invoke: {
    src: 'constructFirstState',
    onDone: 'preFundSetup',
  },
};

const preFundSetup = {
  invoke: {
    id: 'preFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(1),
    onDone: 'directFunding',
  },
};

// FIXME: Abort should not be success

const directFunding = {
  invoke: {
    src: 'directFunding',
    data: ({ allocations, channelId }: Init): DirectFunding.Init => {
      return {
        channelId,
        // TODO: Get eth asset holder address
        minimalAllocation: getEthAllocation(allocations, AddressZero),
      };
    },
    onDone: 'postFundSetup',
  },
};

const postFundSetup = {
  invoke: {
    id: 'postFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(3),
    onDone: 'success',
  },
};

type Context = Init;
export const config: MachineConfig<Context, any, any> = {
  key: PROTOCOL,
  initial: 'constructFirstState',
  states: {
    constructFirstState,
    preFundSetup,
    directFunding,
    postFundSetup,
    success: {
      type: 'final' as 'final',
    },
  },
};

export const machine: MachineFactory<Init, any> = (store: ObsoleteStore, init: Init) => {
  async function constructFirstState(ctx: Init): Promise<void> {
    const { appData, appDefinition, channelId, challengeDuration } = ctx;

    store.sendState({
      channel: store.getEntry(channelId).channel,
      appData,
      appDefinition,
      isFinal: false,
      turnNum: 0,
      outcome: [],
      challengeDuration,
    });
  }

  const services = {
    constructFirstState,
    directFunding: DirectFunding.machine(store),
    advanceChannel: AdvanceChannel.machine(store),
  };

  const options = { services };

  return Machine(config).withConfig(options, init);
};
