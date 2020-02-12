import {Machine, MachineConfig} from 'xstate';

import {Participant, SimpleEthAllocation} from '../store/types';
import * as AdvanceChannel from './advance-channel';
import * as DirectFunding from './direct-funding';
import {MachineFactory} from '../utils/workflow-utils';
import {Store} from '../store';
import {bigNumberify, BigNumber} from 'ethers/utils';
``;

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
    src: 'constructFirstState',
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

// FIXME: Abort should not be success

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
      type: 'final' as 'final'
    }
  }
};

export const machine: MachineFactory<Init, any> = (store: Store, init: Init) => {
  async function constructFirstState(ctx: Init): Promise<void> {
    const {appData, channelId, outcome} = ctx;

    store.signState(channelId, {
      appData,
      isFinal: false,
      turnNum: bigNumberify(0),
      outcome
    });
  }

  const services = {
    constructFirstState,
    directFunding: DirectFunding.machine(store),
    advanceChannel: AdvanceChannel.machine(store)
  };

  const options = {services};

  return Machine(config).withConfig(options, init);
};
