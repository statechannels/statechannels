import * as states from './state';

import * as actions from '../../../actions';

import {
  SharedData,
  signAndInitialize,
  getAddressAndPrivateKey,
  queueMessage,
  checkAndStore,
  signAndStore,
} from '../../../state';
import { IndirectFundingState, failure, success, aWaitForPostFundSetup1 } from '../state';
import { ProtocolStateWithSharedData } from '../..';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { CommitmentType, Commitment, getChannelId } from '../../../../domain';
import { Channel } from 'fmg-core/lib/channel';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../../constants';
import { getChannel, theirAddress } from '../../../channel-store';
import { DirectFundingAction } from '../../direct-funding';
import { directFundingRequested } from '../../direct-funding/actions';
import {
  initialDirectFundingState,
  isSuccess,
  isFailure,
  isTerminal,
} from '../../direct-funding/state';
import { directFundingStateReducer } from '../../direct-funding/reducer';
import { addHex } from '../../../../utils/hex-utils';
import { sendCommitmentReceived } from '../../../../communication';

type ReturnVal = ProtocolStateWithSharedData<IndirectFundingState>;
type IDFAction = actions.indirectFunding.Action;

export function initialize(channelId: string, sharedData: SharedData): ReturnVal {
  const channel = getChannel(sharedData.channelStore, channelId);
  if (!channel) {
    throw new Error(`Could not find existing application channel ${channelId}`);
  }
  // TODO: Should we have to pull these of the commitment or should they just be arguments to initialize?
  const { allocation, destination } = channel.lastCommitment.commitment;
  const ourCommitment = createInitialSetupCommitment(allocation, destination);

  const addressAndPrivateKey = getAddressAndPrivateKey(sharedData, channelId);
  if (!addressAndPrivateKey) {
    throw new Error(`Could not find address and private key for existing channel ${channelId}`);
  }

  const { address, privateKey } = addressAndPrivateKey;
  const signResult = signAndInitialize(sharedData, ourCommitment, address, privateKey);
  if (!signResult.isSuccess) {
    throw new Error('Could not store new ledger channel commitment.');
  }
  sharedData = signResult.store;

  const ledgerId = getChannelId(ourCommitment);

  // just need to put our message in the outbox
  const messageRelay = sendCommitmentReceived(
    theirAddress(channel),
    'processId', // TODO don't use dummy values
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
  );
  sharedData = queueMessage(sharedData, messageRelay);

  const protocolState = states.aWaitForPreFundSetup1({
    channelId,
    ledgerId,
  });
  return { protocolState, sharedData };
}

export function playerAReducer(
  protocolState: states.PlayerAState,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ReturnVal {
  switch (protocolState.type) {
    case 'AWaitForPreFundSetup1':
      return handleWaitForPreFundSetup(protocolState, sharedData, action);
    case 'AWaitForDirectFunding':
      return handleWaitForDirectFunding(protocolState, sharedData, action);
    case 'AWaitForLedgerUpdate1':
      return handleWaitForLedgerUpdate(protocolState, sharedData, action);
    case 'AWaitForPostFundSetup1':
      return handleWaitForPostFundSetup(protocolState, sharedData, action);
    default:
      return { protocolState, sharedData };
  }
}

function handleWaitForPreFundSetup(
  protocolState: states.AWaitForPreFundSetup1,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    throw new Error('Incorrect action');
  }
  const addressAndPrivateKey = getAddressAndPrivateKey(sharedData, protocolState.channelId);
  if (!addressAndPrivateKey) {
    throw new Error(
      `Could not find address and private key for existing channel ${protocolState.channelId}`,
    );
  }

  const checkResult = checkAndStore(sharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    throw new Error('Indirect funding protocol, unable to validate or store commitment');
  }
  sharedData = checkResult.store;

  // TODO: Skipping check if channel is defined/has correct library address
  // Do we really need to do that constantly or is it for debugging mostly?
  const theirCommitment = action.signedCommitment.commitment;
  const ledgerId = getChannelId(theirCommitment);
  // update the state
  const directFundingAction = directFundingRequested(
    'processId',
    ledgerId,
    '0',
    '0', // TODO don't use dummy values
    '0',
    1,
  );
  const directFundingState = initialDirectFundingState(directFundingAction, sharedData);
  const newProtocolState = states.aWaitForDirectFunding({
    ...protocolState,
    ledgerId,
    directFundingState: directFundingState.protocolState,
  });

  return { protocolState: newProtocolState, sharedData };
}

function handleWaitForDirectFunding(
  protocolState: states.AWaitForDirectFunding,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  const existingDirectFundingState = protocolState.directFundingState;
  const protocolStateWithSharedData = directFundingStateReducer(
    existingDirectFundingState,
    sharedData,
    action,
  );
  const newDirectFundingState = protocolStateWithSharedData.protocolState;
  const newProtocolState = { ...protocolState, directFundingState: newDirectFundingState };
  sharedData = protocolStateWithSharedData.sharedData;

  if (!isTerminal(newDirectFundingState)) {
    return { protocolState: newProtocolState, sharedData };
  }
  if (isFailure(newDirectFundingState)) {
    return { protocolState: failure(), sharedData };
  }
  if (isSuccess(newDirectFundingState)) {
    const channel = getChannel(sharedData.channelStore, newProtocolState.ledgerId);
    if (!channel) {
      throw new Error(`Could not find channel for id ${newProtocolState.ledgerId}`);
    }
    const ourCommitment = createInitialLedgerUpdateCommitment(
      protocolState.channelId,
      channel.lastCommitment.commitment,
    );

    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return { protocolState: newProtocolState, sharedData };
    }
    sharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      theirAddress(channel),
      'processId', // TODO don't use dummy values
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
    );
    sharedData = queueMessage(sharedData, messageRelay);

    return { protocolState: states.aWaitForLedgerUpdate1(protocolState), sharedData };
  }

  return { protocolState, sharedData };
}

function handleWaitForLedgerUpdate(
  protocolState: states.AWaitForLedgerUpdate1,
  sharedData: SharedData,
  action: IDFAction,
): ReturnVal {
  const unchangedState = { protocolState, sharedData };
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    throw new Error('Incorrect action');
  }
  const checkResult = checkAndStore(sharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    throw new Error('Indirect funding protocol, unable to validate or store commitment');
  }
  sharedData = checkResult.store;

  const theirCommitment = action.signedCommitment.commitment;
  // TODO: We need to validate the proposed allocation and destination
  const ledgerId = getChannelId(theirCommitment);
  let channel = getChannel(sharedData.channelStore, ledgerId);
  if (!channel || channel.libraryAddress !== CONSENSUS_LIBRARY_ADDRESS) {
    // todo: this could be more robust somehow.
    // Maybe we should generate what we were expecting and compare.
    throw new Error('Bad channel');
  }

  // are we happy that we have the ledger update?
  // if so, we need to craft a post fund setup for the application channel

  // TODO we need the channel information to be passed down from the parent protocol
  const nonce = 0;
  const appChannel: Channel = {
    nonce,
    participants: theirCommitment.destination,
    channelType: '0x0',
  };
  const ourCommitment: Commitment = {
    channel: appChannel,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: 3,
    commitmentCount: 0,
    allocation: ['0', '0'],
    destination: theirCommitment.destination,
    appAttributes: '',
  };

  const signResult = signAndStore(sharedData, ourCommitment);
  if (!signResult.isSuccess) {
    return unchangedState;
    // TODO throw error here?
  }
  sharedData = signResult.store;

  // just need to put our message in the outbox
  const messageRelay = sendCommitmentReceived(
    theirAddress(channel),
    'processId', // TODO don't use dummy values
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
  );
  sharedData = queueMessage(sharedData, messageRelay);
  channel = getChannel(sharedData.channelStore, ledgerId); // refresh channel

  const newProtocolState = aWaitForPostFundSetup1({
    ...protocolState,
  });
  return { protocolState: newProtocolState, sharedData };
}

function createInitialLedgerUpdateCommitment(
  channelIdToFund: string,
  commitment: Commitment,
): Commitment {
  const numParticipants = commitment.channel.participants.length;
  const turnNum = commitment.turnNum + 1;
  const expectedTurnNum = numParticipants * 2;
  if (turnNum !== expectedTurnNum) {
    throw new Error(`Expected a turn number ${expectedTurnNum} received ${turnNum}`);
  }
  const total = commitment.allocation.reduce(addHex);
  const appAttributes = {
    proposedAllocation: [total],
    proposedDestination: [channelIdToFund],
    consensusCounter: 1,
  };
  return {
    ...commitment,
    turnNum,
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
    appAttributes: bytesFromAppAttributes(appAttributes),
  };
}

function handleWaitForPostFundSetup(
  protocolState: states.AWaitForPostFundSetup1,
  sharedData: SharedData,
  action: IDFAction,
): ReturnVal {
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    throw new Error('Incorrect action');
  }
  const checkResult = checkAndStore(sharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    throw new Error('Indirect funding protocol, unable to validate or store commitment');
  }
  sharedData = checkResult.store;

  // are we happy that we have the PostFundSetup?
  // if so, we can exit to the parent protocol with Success

  const newProtocolState = success();

  return { protocolState: newProtocolState, sharedData };
}

function createInitialSetupCommitment(allocation: string[], destination: string[]): Commitment {
  const appAttributes = {
    proposedAllocation: allocation,
    proposedDestination: destination,
    consensusCounter: 0,
  };
  // TODO: We'll run into collisions if we reuse the same nonce
  const nonce = 0;
  const channel: Channel = {
    nonce,
    participants: destination,
    channelType: CONSENSUS_LIBRARY_ADDRESS,
  };
  return {
    turnNum: 0,
    commitmentCount: 0,
    commitmentType: CommitmentType.PreFundSetup,
    appAttributes: bytesFromAppAttributes(appAttributes),
    allocation,
    destination,
    channel,
  };
}
