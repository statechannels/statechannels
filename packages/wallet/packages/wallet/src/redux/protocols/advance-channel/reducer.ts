import * as states from './states';
import {
  SharedData,
  queueMessage,
  registerChannelToMonitor,
  checkAndStore,
  signAndInitialize,
  checkAndInitialize,
  signAndStore,
} from '../../state';
import { ProtocolStateWithSharedData, ProtocolReducer } from '..';
import { CommitmentType, Commitment, getChannelId, nextSetupCommitment } from '../../../domain';
import {
  getChannel,
  nextParticipant,
  getLastCommitment,
  ChannelState,
  Commitments,
} from '../../channel-store';
import { WalletAction } from '../../actions';
import * as selectors from '../../selectors';
import { sendCommitmentsReceived, CommitmentsReceived } from '../../../communication';
import { Channel } from 'fmg-core';
import { isAdvanceChannelAction } from './actions';
import { unreachable } from '../../../utils/reducer-utils';
import { Properties } from '../../utils';

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

    throw new Error('Unimplemented');
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
    case 'AdvanceChannel.ChannelUnknown': {
      return channelUnknownReducer(protocolState, sharedData, action);
    }
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

type NewChannelArgs = Properties<states.ChannelUnknown>;

interface OngoingChannelArgs {
  channelId: string;
}

function isNewChannelArgs(args: NewChannelArgs | OngoingChannelArgs): args is NewChannelArgs {
  if ('privateKey' in args) {
    return true;
  }
  return false;
}

function initializeWithNewChannel(
  processId,
  sharedData: Storage,
  initializeChannelArgs: NewChannelArgs,
) {
  const { channelType, destination, appAttributes, allocation, ourIndex } = initializeChannelArgs;

  if (isSafeToSend({ sharedData, ourIndex })) {
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
    const { privateKey } = initializeChannelArgs;
    const signResult = signAndInitialize(sharedData, ourCommitment, privateKey);
    if (!signResult.isSuccess) {
      throw new Error('Could not store new ledger channel commitment.');
    }
    sharedData = signResult.store;

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
    const protocolState = states.channelUnknown({
      ...initializeChannelArgs,
      processId,
    });

    return { protocolState, sharedData };
  }
}

const channelUnknownReducer: ProtocolReducer<states.AdvanceChannelState> = (
  protocolState: states.ChannelUnknown,
  sharedData,
  action: CommitmentsReceived,
) => {
  const { ourIndex, privateKey, commitmentType } = protocolState;
  const channelId = getChannelId(action.signedCommitments[0].commitment);

  const checkResult = checkAndInitialize(sharedData, action.signedCommitments[0], privateKey);
  if (!checkResult.isSuccess) {
    throw new Error('Could not initialize channel');
  }
  sharedData = checkResult.store;
  sharedData = checkCommitments(sharedData, 0, action.signedCommitments);
  let channel = getChannel(sharedData.channelStore, channelId);

  if (isSafeToSend({ sharedData, ourIndex, channelId })) {
    // First, update the store with our response
    const theirCommitment = getLastCommitment(channel);
    const ourCommitment = nextSetupCommitment(theirCommitment);
    if (ourCommitment === 'NotASetupCommitment') {
      throw new Error('Not a Setup commitment');
    }

    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      throw new Error(`Could not sign result: ${signResult.reason}`);
    }
    sharedData = signResult.store;

    // Then, register to monitor the channel
    sharedData = registerChannelToMonitor(sharedData, protocolState.processId, channelId);

    // Finally, send the commitments to the next participant
    channel = getChannel(sharedData.channelStore, channelId);
    const { participants } = channel;
    const messageRelay = sendCommitmentsReceived(
      nextParticipant(participants, ourIndex),
      protocolState.processId,
      channel.commitments,
    );

    sharedData = queueMessage(sharedData, messageRelay);

    if (channelAdvanced(channel, commitmentType)) {
      return { protocolState: states.success(protocolState), sharedData };
    } else {
      return { protocolState: states.commitmentSent({ ...protocolState, channelId }), sharedData };
    }
  } else {
    return { protocolState, sharedData };
  }
};

function checkCommitments(
  sharedData: SharedData,
  turnNum: number,
  commitments: Commitments,
): SharedData {
  // We don't bother checking "stale" commitments -- those whose turnNum does not
  // exceed the current turnNum.

  commitments
    .filter(sc => sc.commitment.turnNum > turnNum)
    .map(sc => {
      const result = checkAndStore(sharedData, sc);
      if (result.isSuccess) {
        sharedData = result.store;
      } else {
        throw new Error('Unable to validate commitment');
      }
    });

  return sharedData;
}

const notSafeToSendReducer: ProtocolReducer<states.NonTerminalAdvanceChannelState> = (
  protocolState: states.NotSafeToSend,
  sharedData,
  action: CommitmentsReceived,
) => {
  const { ourIndex, channelId } = protocolState;

  const channel = getChannel(sharedData.channelStore, channelId);
  sharedData = checkCommitments(sharedData, channel.turnNum, action.signedCommitments);

  if (isSafeToSend({ sharedData, ourIndex, channelId })) {
    return { protocolState: states.commitmentSent({ ...protocolState, channelId }), sharedData };
  } else {
    return { protocolState, sharedData };
  }
};

const commitmentSentReducer: ProtocolReducer<states.AdvanceChannelState> = (
  protocolState: states.CommitmentSent,
  sharedData,
  action: CommitmentsReceived,
) => {
  const { channelId, commitmentType } = protocolState;

  let channel = getChannel(sharedData.channelStore, channelId);
  sharedData = checkCommitments(sharedData, channel.turnNum, action.signedCommitments);

  channel = getChannel(sharedData.channelStore, channelId);
  if (channelAdvanced(channel, commitmentType)) {
    return { protocolState: states.success(protocolState), sharedData };
  }

  return { protocolState, sharedData };
};

function isSafeToSend({
  sharedData,
  channelId,
  ourIndex,
}: {
  sharedData: SharedData;
  ourIndex: number;
  channelId?: string;
}): boolean {
  // The possibilities are:
  // A. The channel is not in storage and our index is 0.
  // B. The channel is not in storage and our index is not 0.
  // C. The channel is in storage and it's our turn
  // D. The channel is in storage and it's not our turn

  if (!channelId) {
    return ourIndex === 0;
  }

  return true;
}

function channelAdvanced(channel: ChannelState, commitmentType: CommitmentType): boolean {
  const lastCommitment = getLastCommitment(channel);
  return (
    lastCommitment.commitmentType >= commitmentType &&
    lastCommitment.commitmentCount === channel.participants.length - 1
  );
}
