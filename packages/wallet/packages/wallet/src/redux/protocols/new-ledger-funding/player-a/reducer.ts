import * as states from './states';
import {
  SharedData,
  signAndInitialize,
  getPrivatekey,
  queueMessage,
  checkAndStore,
  signAndStore,
  registerChannelToMonitor,
  setFundingState,
} from '../../../state';
import { NewLedgerFundingState, failure, success } from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { CommitmentType, Commitment, getChannelId, nextSetupCommitment } from '../../../../domain';
import { Channel } from 'fmg-core/lib/channel';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../../constants';
import { getChannel, theirAddress, getLastCommitment } from '../../../channel-store';
import { sendCommitmentReceived } from '../../../../communication';
import { DirectFundingAction } from '../../direct-funding';
import { directFundingRequested } from '../../direct-funding/actions';
import { isSuccess, isFailure, isTerminal } from '../../direct-funding/states';
import {
  directFundingStateReducer,
  initialize as initializeDirectFunding,
} from '../../direct-funding/reducer';
import { addHex } from '../../../../utils/hex-utils';
import { proposeNewConsensus } from '../../../../domain/consensus-app';
import { unreachable } from '../../../../utils/reducer-utils';
import { isTransactionAction } from '../../../actions';
import { ChannelFundingState } from '../../../state';
import { NewLedgerFundingAction } from '../actions';
import * as selectors from '../../../selectors';

type ReturnVal = ProtocolStateWithSharedData<NewLedgerFundingState>;
type IDFAction = NewLedgerFundingAction;

export function initialize(
  processId: string,
  channelId: string,
  sharedData: SharedData,
): ReturnVal {
  const channel = getChannel(sharedData.channelStore, channelId);
  if (!channel) {
    throw new Error(`Could not find existing application channel ${channelId}`);
  }
  // TODO: Should we have to pull these of the commitment or should they just be arguments to initialize?
  const { allocation, destination } = getLastCommitment(channel);
  const ourCommitment = createInitialSetupCommitment(sharedData, allocation, destination);

  const privateKey = getPrivatekey(sharedData, channelId);
  if (!privateKey) {
    throw new Error(`Could not find private key for existing channel ${channelId}`);
  }

  const signResult = signAndInitialize(sharedData, ourCommitment, privateKey);
  if (!signResult.isSuccess) {
    throw new Error('Could not store new ledger channel commitment.');
  }
  sharedData = signResult.store;
  const ledgerId = getChannelId(ourCommitment);
  sharedData = registerChannelToMonitor(sharedData, processId, ledgerId);

  // just need to put our message in the outbox
  const messageRelay = sendCommitmentReceived(
    theirAddress(channel),
    processId,
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
  );
  sharedData = queueMessage(sharedData, messageRelay);

  const protocolState = states.aWaitForPreFundSetup1({
    channelId,
    ledgerId,
    processId,
  });
  return { protocolState, sharedData };
}

export function playerAReducer(
  protocolState: states.PlayerAState,
  sharedData: SharedData,
  action: NewLedgerFundingAction,
): ReturnVal {
  switch (protocolState.type) {
    case 'NewLedgerFunding.AWaitForPreFundSetup1':
      return handleWaitForPreFundSetup(protocolState, sharedData, action);
    case 'NewLedgerFunding.AWaitForDirectFunding':
      return handleWaitForDirectFunding(protocolState, sharedData, action);
    case 'NewLedgerFunding.AWaitForLedgerUpdate1':
      return handleWaitForLedgerUpdate(protocolState, sharedData, action);
    case 'NewLedgerFunding.AWaitForPostFundSetup1':
      return handleWaitForPostFundSetup(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
}

function handleWaitForPostFundSetup(
  protocolState: states.AWaitForPostFundSetup1,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    throw new Error(`Incorrect action ${action.type}`);
  }
  const checkResult = checkAndStore(sharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    throw new Error('Indirect funding protocol, unable to validate or store commitment');
  }
  sharedData = checkResult.store;

  // update fundingState
  const fundingState: ChannelFundingState = {
    directlyFunded: false,
    fundingChannel: protocolState.ledgerId,
  };

  sharedData = setFundingState(sharedData, protocolState.channelId, fundingState);
  const newProtocolState = success({});
  const newReturnVal = { protocolState: newProtocolState, sharedData };
  return newReturnVal;
}

function handleWaitForLedgerUpdate(
  protocolState: states.AWaitForLedgerUpdate1,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  const unchangedState = { protocolState, sharedData };
  if (isTransactionAction(action)) {
    console.warn(
      `Ignoring transaction action ${action.type} since direct funding has been completed already.`,
    );
    return unchangedState;
  }
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    throw new Error(`Incorrect action ${action.type}`);
  }
  const checkResult = checkAndStore(sharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    throw new Error('Indirect funding protocol, unable to validate or store commitment');
  }
  sharedData = checkResult.store;

  // We can now create a post fund commitment for the app
  const appChannel = getChannel(sharedData.channelStore, protocolState.channelId);
  if (!appChannel) {
    throw new Error(`Could not find app channel for id ${protocolState.channelId}`);
  }
  const theirAppCommitment = getLastCommitment(appChannel);

  const ourAppCommitment = nextSetupCommitment(theirAppCommitment);
  if (ourAppCommitment === 'NotASetupCommitment') {
    throw new Error('Not a Setup commitment');
  }
  const signResult = signAndStore(sharedData, ourAppCommitment);
  if (!signResult.isSuccess) {
    return unchangedState;
  }
  sharedData = signResult.store;

  // just need to put our message in the outbox
  const messageRelay = sendCommitmentReceived(
    theirAddress(appChannel),
    protocolState.processId,
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
  );
  sharedData = queueMessage(sharedData, messageRelay);

  const newProtocolState = states.aWaitForPostFundSetup1(protocolState);
  const newReturnVal = { protocolState: newProtocolState, sharedData };
  return newReturnVal;
}

function handleWaitForPreFundSetup(
  protocolState: states.AWaitForPreFundSetup1,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    throw new Error(`Incorrect action ${action.type}`);
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

  const total = theirCommitment.allocation.reduce(addHex);
  const ourAmount = theirCommitment.allocation[0];
  // update the state
  const directFundingAction = directFundingRequested({
    processId: protocolState.processId,
    channelId: ledgerId,
    safeToDepositLevel: '0x0',
    totalFundingRequired: total,
    requiredDeposit: ourAmount,
    ourIndex: 0,
    exchangePostFundSetups: true,
  });
  const directFundingState = initializeDirectFunding(directFundingAction, sharedData);
  const newProtocolState = states.aWaitForDirectFunding({
    ...protocolState,
    ledgerId,
    directFundingState: directFundingState.protocolState,
  });
  sharedData = directFundingState.sharedData;

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
    return { protocolState: failure({}), sharedData };
  }
  if (isSuccess(newDirectFundingState)) {
    const channel = getChannel(sharedData.channelStore, newProtocolState.ledgerId);
    if (!channel) {
      throw new Error(`Could not find channel for id ${newProtocolState.ledgerId}`);
    }

    const theirCommitment = getLastCommitment(channel);
    const total = theirCommitment.allocation.reduce(addHex);
    const ourCommitment = proposeNewConsensus(theirCommitment, [total], [protocolState.channelId]);
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return { protocolState: newProtocolState, sharedData };
    }
    sharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      theirAddress(channel),
      protocolState.processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
    );
    sharedData = queueMessage(sharedData, messageRelay);

    return { protocolState: states.aWaitForLedgerUpdate1(protocolState), sharedData };
  }

  return { protocolState, sharedData };
}

function createInitialSetupCommitment(
  sharedData: SharedData,
  allocation: string[],
  destination: string[],
): Commitment {
  const appAttributes = {
    proposedAllocation: [],
    proposedDestination: [],
    furtherVotesRequired: 0,
  };

  const nonce = selectors.getNextNonce(sharedData, CONSENSUS_LIBRARY_ADDRESS);
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
