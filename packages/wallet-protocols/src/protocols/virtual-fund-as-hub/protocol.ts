import { assign } from 'xstate';
import { Channel } from '@statechannels/nitro-protocol';

import { Store } from '../../store';
import { Balance } from '../../types';
import { connectToStore, getDataAndInvoke } from '../../machine-utils';
import { VirtualLeaf, CreateNullChannel, SupportState } from '../';
const PROTOCOL = 'virtual-funding-as-hub';

export interface Init {
  balances: Balance[];
  leftLedgerId: string;
  rightLedgerId: string;
  targetChannelId: string;
  hubAddress: string;
}

type ChannelsKnown = Init & {
  jointChannel: Channel;
  leftGuarantorChannel: Channel;
  rightGuarantorChannel: Channel;
};

const createJointChannel = {
  invoke: {
    src: 'createNullChannel',
    data: ({ jointChannel, balances }: ChannelsKnown): CreateNullChannel.Init =>
      VirtualLeaf.jointChannelArgs({
        jointChannel: jointChannel,
        balances: balances,
        hubAddress: jointChannel.participants[1],
      }),
  },
};

const createLeftGuarantorChannel = {
  invoke: {
    src: 'createNullChannel',
    data: ({ jointChannel, leftGuarantorChannel }: ChannelsKnown): CreateNullChannel.Init =>
      VirtualLeaf.guarantorChannelArgs({
        jointChannel,
        guarantorChannel: leftGuarantorChannel,
        index: VirtualLeaf.Indices.Left,
      }),
  },
};

const createRightGuarantorChannel = {
  invoke: {
    src: 'createNullChannel',
    data: ({ jointChannel, rightGuarantorChannel }: ChannelsKnown): CreateNullChannel.Init =>
      VirtualLeaf.guarantorChannelArgs({
        jointChannel,
        guarantorChannel: rightGuarantorChannel,
        index: VirtualLeaf.Indices.Right,
      }),
  },
};

export const assignChannels = (store: Store) =>
  assign(
    (ctx: Init): ChannelsKnown => {
      const { leftLedgerId, rightLedgerId } = ctx;
      const { channel: leftLedgerChannel } = store.getEntry(leftLedgerId).latestState;
      const { channel: rightLedgerChannel } = store.getEntry(rightLedgerId).latestState;

      const jointParticipants = [
        ...leftLedgerChannel.participants,
        rightLedgerChannel.participants[1],
      ];
      const jointChannel: Channel = {
        participants: jointParticipants,
        channelNonce: store.getNextNonce(jointParticipants),
        chainId: 'TODO',
      };

      const leftGuarantorChannel: Channel = {
        ...leftLedgerChannel,
        channelNonce: store.getNextNonce(leftLedgerChannel.participants),
      };

      const rightGuarantorChannel: Channel = {
        ...rightLedgerChannel,
        channelNonce: store.getNextNonce(rightLedgerChannel.participants),
      };

      return {
        ...ctx,
        jointChannel,
        leftGuarantorChannel,
        rightGuarantorChannel,
      };
    }
  );
const createChannels = {
  entry: 'assignChannels',
  type: 'parallel',
  states: { createLeftGuarantorChannel, createRightGuarantorChannel, createJointChannel },
  onDone: 'fundGuarantors',
};

const fundLeftGuarantor = { invoke: { src: 'ledgerFunding', data: 'TODO' } };
const fundRightGuarantor = { invoke: { src: 'ledgerFunding', data: 'TODO' } };
const fundGuarantors = {
  type: 'parallel',
  states: { fundLeftGuarantor, fundRightGuarantor },
  onDone: 'fundTarget',
};

const fundTarget = getDataAndInvoke('fundTargetArgs', 'supportState', 'success');

// PROTOCOL DEFINITION
export const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: { createChannels, fundGuarantors, fundTarget, success: { type: 'final' } },
};

const options = (store: Store) => ({
  actions: { assignChannels: assignChannels(store) },
  services: {
    fundTargetArgs: VirtualLeaf.fundTargetArgs(store),
    createNullChannel: CreateNullChannel.machine(store),
    supportState: SupportState.machine(store),
  },
});

export const machine = connectToStore(config, options);
