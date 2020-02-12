import { Channel } from '@statechannels/nitro-protocol';

import { ObsoleteStore } from '../../store';
import { Balance } from '../../types';
import { connectToStore, getDataAndInvoke } from '../../machine-utils';
import { VirtualLeaf, CreateNullChannel, SupportState, LedgerFunding } from '../';
import { FINAL } from '../..';
const PROTOCOL = 'virtual-funding-as-hub';

export interface Init {
  balances: Balance[];
  targetChannelId: string;
  hubAddress: string;
  jointChannel: Channel;
  guarantorChannels: [Channel, Channel];
}

const jointChannelArgs = (store: ObsoleteStore) => async ({
  jointChannel,
  balances,
}: Init): Promise<CreateNullChannel.Init> =>
  VirtualLeaf.jointChannelArgs(store)({
    jointChannel: jointChannel,
    balances: balances,
    hubAddress: jointChannel.participants[1],
  });

const createJointChannel = getDataAndInvoke(
  'jointChannelArgs',
  'createNullChannel',
  undefined,
  'joint'
);

const guarantorArgs = (index: VirtualLeaf.Indices) => (store: ObsoleteStore) => async ({
  jointChannel,
  guarantorChannels,
}: Init): Promise<CreateNullChannel.Init> =>
  VirtualLeaf.guarantorChannelArgs(store)({
    jointChannel,
    guarantorChannel: guarantorChannels[index],
    index,
  });

const leftGuarantorArgs = guarantorArgs(0);
const createLeftGuarantorChannel = getDataAndInvoke(
  'leftGuarantorArgs',
  'createNullChannel',
  undefined,
  'left'
);

const rightGuarantorArgs = guarantorArgs(1);
const createRightGuarantorChannel = getDataAndInvoke(
  'rightGuarantorArgs',
  'createNullChannel',
  undefined,
  'right'
);

const parallel = 'parallel' as 'parallel';
const createChannels = {
  type: parallel,
  states: { createLeftGuarantorChannel, createRightGuarantorChannel, createJointChannel },
  onDone: 'fundGuarantors',
};

const fundGuarantorArgs = (index: VirtualLeaf.Indices) => ({
  guarantorChannels,
  balances,
  hubAddress,
}: Init): LedgerFunding.Init =>
  VirtualLeaf.fundGuarantorArgs({
    guarantorChannel: guarantorChannels[index],
    index,
    balances,
    hubAddress,
  });
const fundGuarantor = index => ({
  initial: 'fund',
  states: {
    fund: {
      invoke: {
        id: `fundGuarantor-${index}`,
        src: 'ledgerFunding',
        data: fundGuarantorArgs(index),
        onDone: 'done',
      },
    },
    done: { type: FINAL },
  },
});
const fundGuarantors = {
  type: parallel,
  states: {
    fundLeftGuarantor: fundGuarantor(0),
    fundRightGuarantor: fundGuarantor(1),
  },
  onDone: 'fundTarget',
};

const fundTarget = getDataAndInvoke('fundTargetArgs', 'supportState', 'success');

// PROTOCOL DEFINITION
export const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: { createChannels, fundGuarantors, fundTarget, success: { type: FINAL } },
};

const options = (store: ObsoleteStore) => ({
  services: {
    fundTargetArgs: VirtualLeaf.fundTargetArgs(store),
    createNullChannel: CreateNullChannel.machine(store),
    supportState: SupportState.machine(store),
    ledgerFunding: LedgerFunding.machine(store),
    jointChannelArgs: jointChannelArgs(store),
    leftGuarantorArgs: leftGuarantorArgs(store),
    rightGuarantorArgs: rightGuarantorArgs(store),
  },
});

export const machine = connectToStore<any>(config, options);
