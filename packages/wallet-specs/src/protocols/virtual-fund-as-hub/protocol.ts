import { Balance, Channel } from '../../';
import { saveConfig } from '../../utils';

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
  jointChannel: Channel;
  targetChannelId: string;
  leftLedgerId: string;
  leftGuarantorChannel: Channel;
  rightLedgerId: string;
  rightGuarantorChannel: Channel;
}

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
const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: {
    createChannels,
    fundGuarantors,
    fundTarget,
    success: { type: 'final' },
  },
};

const guards = {};
saveConfig(config, __dirname, { guards });
