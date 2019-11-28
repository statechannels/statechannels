import {
  add,
  AllocationItem,
  Balance,
  Channel,
  getChannelID,
  Guarantee,
} from '../../';
import { saveConfig } from '../../utils';
import { Init as CreateNullChannelArgs } from '../create-null-channel/protocol';
import { Init as SupportStateArgs } from '../support-state/protocol';

const PROTOCOL = 'ledger-update';

export interface Init {
  balances: Balance[];
  jointChannel: Channel;
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
  onDone: 'success',
};

// PROTOCOL DEFINITION
const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: {
    createChannels,
    fundGuarantors,
    success: { type: 'final' },
  },
};

const guards = {};
saveConfig(config, __dirname, { guards });
