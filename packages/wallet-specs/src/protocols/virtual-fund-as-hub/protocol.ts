import { assign } from 'xstate';
import { Balance, Channel, store } from '../../';

const PROTOCOL = 'virtual-funding-as-hub';

/*
Since this protocol requires communication from the "customers",
they might as well inform the hub what the target channel is.

TODO: We will probably later have a more passive hub protocol which simply agrees to any
update in the joint channel that's hub-neutral. At that point, we can remove `targetChannelId` from
the args here.
*/
export interface Init {
  balances: Balance[];
  targetChannelId: string;
  leftLedgerId: string;
  rightLedgerId: string;
}

type ChannelsKnown = Init & {
  jointChannel: Channel;
  leftGuarantorChannel: Channel;
  rightGuarantorChannel: Channel;
};

export const assignChannels = assign(
  (init: Init): ChannelsKnown => {
    const { leftLedgerId, rightLedgerId, targetChannelId } = init;
    const { channel: leftLedgerChannel } = store.getLatestState(leftLedgerId);
    const { channel: rightLedgerChannel } = store.getLatestState(rightLedgerId);

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
      ...init,
      jointChannel,
      leftGuarantorChannel,
      rightGuarantorChannel,
    };
  }
);
const createJointChannel = {
  invoke: {
    src: 'createNullChannel',
    data: 'jointChannelArgs', // import from leaf version
  },
};

const createLeftGuarantorChannel = {
  invoke: {
    src: 'createNullChannel',
    data: 'guarantorChannelArgs',
  },
};

const createRightGuarantorChannel = {
  invoke: {
    src: 'createNullChannel',
    data: 'guarantorChannelArgs',
  },
};

const createChannels = {
  entry: 'assignChannels',
  type: 'parallel',
  states: {
    createLeftGuarantorChannel,
    createRightGuarantorChannel,
    createJointChannel,
  },
  onDone: 'fundGuarantors',
};

const fundLeftGuarantor = {
  invoke: {
    src: 'supportState',
    data: 'guarantorOutcome',
  },
};
const fundRightGuarantor = {
  invoke: {
    src: 'supportState',
    data: 'guarantorOutcome',
  },
};

const fundGuarantors = {
  type: 'parallel',
  states: {
    fundLeftGuarantor,
    fundRightGuarantor,
  },
  onDone: 'fundTarget',
};

const fundTarget = {
  invoke: {
    src: 'supportState',
    data: 'jointOutcome',
    onDone: 'success',
  },
};

// PROTOCOL DEFINITION
export const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: {
    createChannels,
    fundGuarantors,
    fundTarget,
    success: { type: 'final' },
  },
};
