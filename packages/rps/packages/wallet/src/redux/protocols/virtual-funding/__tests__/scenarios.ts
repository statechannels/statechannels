import * as states from '../states';

import { EMPTY_SHARED_DATA, setChannel } from '../../../state';
import * as scenarios from '../../../__tests__/test-scenarios';
import { CommitmentType } from '../../../../domain';
import { preSuccess, success } from '../../advance-channel/__tests__';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { appCommitment, twoThree } from '../../../../domain/commitments/__tests__';

// ---------
// Test data
// ---------
const processId = 'Process.123';
const {
  asAddress,
  asPrivateKey,
  signedJointLedgerCommitments,
  threeParticipants: destination,
  oneTwoThree: allocation,
  ledgerLibraryAddress: channelType,
} = scenarios;
const { signedCommitment0 } = signedJointLedgerCommitments;
const appAttributes = signedCommitment0.commitment.appAttributes;

const app0 = appCommitment({ turnNum: 0, balances: twoThree });
const app1 = appCommitment({ turnNum: 1, balances: twoThree });
const appChannel = channelFromCommitments([app0, app1], asAddress, asPrivateKey);
const targetChannelId = appChannel.channelId;

// To properly test the embedded advanceChannel protocols, it's useful to be playerA
// to make sure that the commitments get sent.
const initializeArgs = {
  startingAllocation: allocation,
  startingDestination: destination,
  channelType,
  appAttributes,
  processId,
  clearedToSend: true,
  address: asAddress,
  privateKey: asPrivateKey,
  ourIndex: 0,
  commitmentType: CommitmentType.PreFundSetup,
  targetChannelId,
};

const props = {
  targetChannelId,
  processId,
};

// ----
// States
// ------

const scenarioStates = {
  waitForJointChannel: states.waitForJointChannel({
    ...props,
    [states.JOINT_CHANNEL_DESCRIPTOR]: preSuccess.state,
  }),

  waitForGuarantorChannel: states.waitForGuarantorChannel({
    ...props,
    [states.GUARANTOR_CHANNEL_DESCRIPTOR]: success.state,
  }),
};

// -------
// Shared Data
// -------

// -------
// Actions
// -------

// ---------
// Scenarios
// ---------

export const happyPath = {
  ...props,
  initialize: {
    args: initializeArgs,
    sharedData: setChannel(EMPTY_SHARED_DATA, appChannel),
  },
  openJ: {
    state: scenarioStates.waitForJointChannel,
    action: { ...preSuccess.trigger, protocolLocator: states.JOINT_CHANNEL_DESCRIPTOR },
    sharedData: preSuccess.sharedData,
  },
  openG: {
    state: scenarioStates.waitForGuarantorChannel,
    action: { ...preSuccess.trigger, protocolLocator: states.GUARANTOR_CHANNEL_DESCRIPTOR },
    sharedData: preSuccess.sharedData,
  },
};
