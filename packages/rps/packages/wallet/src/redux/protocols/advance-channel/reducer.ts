import * as states from './states';
import { SharedData, queueMessage, registerChannelToMonitor, setChannel } from '../../state';
import { ProtocolStateWithSharedData, ProtocolReducer } from '..';
import { CommitmentType, Commitment, getChannelId } from '../../../domain';
import {
  getChannel,
  signAndInitialize,
  nextParticipant,
  getLastCommitment,
  validTransitions,
  ChannelState,
  Commitments,
} from '../../channel-store';
import { WalletAction } from '../../actions';
import * as selectors from '../../selectors';
import { sendCommitmentsReceived, CommitmentsReceived } from '../../../communication';
import { Channel } from 'fmg-core';
import { isAdvanceChannelAction } from './actions';
import { unreachable } from '../../../utils/reducer-utils';

type ReturnVal = ProtocolStateWithSharedData<states.AdvanceChannelState>;
type Storage = SharedData;

export function initialize(
  processId: string,
  sharedData: Storage,
  commitmentType: CommitmentType,
  args: NewChannelArgs | OngoingChannelArgs,
): ReturnVal {
  if (commitmentType === CommitmentType.PreFundSetup) {
    if (!isNewChannelArgs(args)) {
      throw new Error('Must receive NewChannelArgs');
    }
    return initializeWithNewChannel(processId, sharedData, args);
  } else {
    if (isNewChannelArgs(args)) {
      throw new Error('Must receive OngoingChannelArgs');
    }
    const { channelId } = args;
    const channel = getChannel(sharedData.channelStore, channelId);
    if (!channel) {
      throw new Error(`Could not find existing channel ${channelId}`);
    }
    return initializeWithExistingChannel(channel, processId, sharedData);
  }
}

export const reducer: ProtocolReducer<states.AdvanceChannelState> = (
  protocolState: states.NonTerminalAdvanceChannelState,
  sharedData: SharedData,
  action: WalletAction,
) => {
  if (!isAdvanceChannelAction(action)) {
    console.error('Invalid action: expected WALLET.ADVANCE_CHANNEL.COMMITMENTS_RECEIVED');
    return { protocolState, sharedData };
  }

  switch (protocolState.type) {
    case 'AdvanceChannel.NotSafeToSend': {
      return notSafeToSendReducer(protocolState, sharedData, action);
    }
    case 'AdvanceChannel.CommitmentSent': {
      return commitmentSentReducer(protocolState, sharedData, action);
    }
    default:
      return unreachable(protocolState);
  }
};

interface NewChannelArgs {
  ourIndex: number;
  allocation: string[];
  destination: string[];
  channelType: string;
  appAttributes: string;
  address: string;
  privateKey: string;
}

interface OngoingChannelArgs {
  channelId: string;
}

function isNewChannelArgs(args: NewChannelArgs | OngoingChannelArgs): args is NewChannelArgs {
  if ('channelId' in args) {
    return false;
  }
  return true;
}

function initializeWithNewChannel(
  processId,
  sharedData: Storage,
  initializeChannelArgs: NewChannelArgs,
) {
  if (isSafeToSend(sharedData)) {
    const { channelType, destination, appAttributes, allocation, ourIndex } = initializeChannelArgs;

    // Initialize the channel in the store
    const nonce = selectors.getNextNonce(sharedData, channelType);
    const participants = destination;
    const channel: Channel = {
      nonce,
      participants,
      channelType,
    };
    const ourCommitment: Commitment = {
      turnNum: 0,
      commitmentCount: 0,
      commitmentType: CommitmentType.PreFundSetup,
      appAttributes,
      allocation,
      destination,
      channel,
    };
    const { address, privateKey } = initializeChannelArgs;
    const signResult = signAndInitialize(
      sharedData.channelStore,
      ourCommitment,
      address,
      privateKey,
    );
    if (!signResult.isSuccess) {
      throw new Error('Could not store new ledger channel commitment.');
    }
    sharedData = { ...sharedData, channelStore: signResult.store };

    // Register channel to monitor
    const channelId = getChannelId(ourCommitment);
    sharedData = registerChannelToMonitor(sharedData, processId, channelId);

    // Send commitments to next participant
    const messageRelay = sendCommitmentsReceived(
      nextParticipant(participants, ourIndex),
      processId,
      [signResult.signedCommitment],
    );
    sharedData = queueMessage(sharedData, messageRelay);

    const protocolState = states.commitmentSent({
      ...initializeChannelArgs,
      processId,
      channelId,
    });
    return {
      protocolState,
      sharedData,
    };
  } else {
    throw new Error('Unimplemented');
  }
}

function initializeWithExistingChannel(channel, processId, sharedData) {
  const { ourIndex, channelId } = channel;
  return { protocolState: states.notSafeToSend({ processId, channelId, ourIndex }), sharedData };
}

const notSafeToSendReducer: ProtocolReducer<states.NonTerminalAdvanceChannelState> = (
  protocolState,
  sharedData,
  action,
) => {
  if (isSafeToSend(sharedData)) {
    return { protocolState, sharedData };
  } else {
    return { protocolState, sharedData };
  }
};

const commitmentSentReducer: ProtocolReducer<states.AdvanceChannelState> = (
  protocolState,
  sharedData,
  action: CommitmentsReceived,
) => {
  const { channelId } = protocolState;
  const channel = getChannel(sharedData.channelStore, channelId);
  if (!channel) {
    return { protocolState, sharedData };
  }

  const { signedCommitments } = action;

  if (advancesChannel(channel, signedCommitments)) {
    sharedData = setChannel(sharedData, { ...channel, commitments: signedCommitments });
    return { protocolState: states.success(protocolState), sharedData };
  }

  return { protocolState, sharedData };
};

function isSafeToSend(sharedData: SharedData): boolean {
  return true;
}

function advancesChannel(channel: ChannelState, newCommitments: Commitments): boolean {
  const lastCommitment = getLastCommitment(channel);
  return (
    newCommitments[0].commitment === lastCommitment &&
    validTransitions(newCommitments) &&
    newCommitments.length === lastCommitment.channel.participants.length
  );
}
