import {Machine, MachineConfig} from 'xstate';

import {Participant, SimpleEthAllocation} from '../store/types';
import * as AdvanceChannel from './advance-channel';
import * as DirectFunding from './direct-funding';
import {MachineFactory} from '../utils/workflow-utils';
import {Store} from '../store';
import {bigNumberify, BigNumber} from 'ethers/utils';

const PROTOCOL = 'create-and-direct-fund';

export enum Indices {
  Left = 0,
  Right = 0
}

export type Init = {
  participants: Participant[];
  outcome: SimpleEthAllocation;
  appDefinition: string;
  appData: string;
  channelId: string;
  challengeDuration: BigNumber;
  index: Indices;
};

export const advanceChannelArgs = (i: 1 | 3) => ({channelId}: Init): AdvanceChannel.Init => ({
  channelId,
  targetTurnNum: i
});

const constructFirstState = {
  invoke: {
    src: 'constructFirstStateService',
    onDone: 'preFundSetup'
  }
};

const preFundSetup = {
  invoke: {
    id: 'preFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(1),
    onDone: 'directFunding'
  }
};

const directFunding = {
  invoke: {
    src: 'directFunding',
    data: ({outcome, channelId}: Init): DirectFunding.Init => {
      return {
        channelId,
        minimalAllocation: outcome
      };
    },
    onDone: 'postFundSetup'
  }
};

const postFundSetup = {
  invoke: {
    id: 'postFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(3),
    onDone: 'success'
  }
};

export const config: MachineConfig<Init, any, any> = {
  key: PROTOCOL,
  initial: 'constructFirstState',
  states: {
    constructFirstState,
    preFundSetup,
    directFunding,
    postFundSetup,
    success: {
      type: 'final' as 'final'
    }
  }
};

export const machine: MachineFactory<Init, any> = (store: Store, init: Init) => {
  const constructFirstStateService = async ({appData, channelId, outcome}: Init): Promise<void> =>
    await store.signAndAddState(channelId, {
      appData,
      isFinal: false,
      turnNum: bigNumberify(0),
      outcome
    });

  return Machine(config).withConfig(
    {
      services: {
        constructFirstStateService,
        directFunding: DirectFunding.machine(store),
        advanceChannel: AdvanceChannel.machine(store)
      }
    },
    init
  );
};
