import * as states from '../state';
import { PlayerBState } from '../state';

import * as actions from '../../../actions';

import { ProtocolStateWithSharedData } from '../../';
import {
  SharedData,
  checkAndStore,
  getChannel,
  signAndStore,
  queueMessage,
  checkAndInitialize,
  getAddressAndPrivateKey,
  registerChannelToMonitor,
} from '../../../state';
import { IndirectFundingState, failure, success } from '../state';
import { unreachable } from '../../../../utils/reducer-utils';
import {
  BWaitForPreFundSetup0,
  BWaitForDirectFunding,
  BWaitForLedgerUpdate0,
  BWaitForPostFundSetup0,
  bWaitForDirectFunding,
  bWaitForLedgerUpdate0,
  bWaitForPostFundSetup0,
} from './state';
import { getChannelId, nextSetupCommitment } from '../../../../domain';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../../constants';
import { theirAddress } from '../../../../redux/channel-store';
import { initialDirectFundingState } from '../../direct-funding/state';

import { directFundingRequested } from '../../direct-funding/actions';
import { DirectFundingAction } from '../../direct-funding';
import { directFundingStateReducer } from '../../direct-funding/reducer';
import { isSuccess, isFailure } from '../../direct-funding/state';
import { acceptConsensus } from '../../../../domain/two-player-consensus-game';
import { sendCommitmentReceived } from '../../../../communication';
import { addHex } from '../../../../utils/hex-utils';

type ReturnVal = ProtocolStateWithSharedData<IndirectFundingState>;
type IDFAction = actions.indirectFunding.Action;

export function initialize(
  processId: string,
  channelId: string,
  sharedData: SharedData,
): ReturnVal {
  // todo: check that channel exists?
  return { protocolState: states.bWaitForPreFundSetup0({ processId, channelId }), sharedData };
}

export function playerBReducer(
  protocolState: PlayerBState,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  switch (protocolState.type) {
    case 'BWaitForPreFundSetup0':
      return handleWaitForPreFundSetup(protocolState, sharedData, action);
    case 'BWaitForDirectFunding': // defer to child reducer
      return handleWaitForDirectFunding(protocolState, sharedData, action);
    case 'BWaitForLedgerUpdate0':
      return handleWaitForLedgerUpdate(protocolState, sharedData, action);
    case 'BWaitForPostFundSetup0':
      return handleWaitForPostFundSetup(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
}

function handleWaitForPreFundSetup(
  protocolState: BWaitForPreFundSetup0,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  const unchangedState = { protocolState, sharedData };
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    throw new Error('Incorrect action');
  }
  const addressAndPrivateKey = getAddressAndPrivateKey(sharedData, protocolState.channelId);
  if (!addressAndPrivateKey) {
    throw new Error(
      `Could not find address and private key for existing channel ${protocolState.channelId}`,
    );
  }

  const checkResult = checkAndInitialize(
    sharedData,
    action.signedCommitment,
    addressAndPrivateKey.address,
    addressAndPrivateKey.privateKey,
  );
  if (!checkResult.isSuccess) {
    throw new Error('Indirect funding protocol, unable to validate or store commitment');
  }
  sharedData = checkResult.store;

  // at this point we don't know for sure that it was a pre-fund setup.
  // they could've sent us any valid update

  const theirCommitment = action.signedCommitment.commitment;
  const ledgerId = getChannelId(theirCommitment);
  let channel = getChannel(sharedData, ledgerId);
  if (!channel || channel.turnNum !== 0 || channel.libraryAddress !== CONSENSUS_LIBRARY_ADDRESS) {
    // todo: this could be more robust somehow.
    // Maybe we should generate what we were expecting and compare.
    throw new Error('Bad channel');
  }

  // at this point we're happy that we have the pre-fund setup
  // we need to craft our reply

  const ourCommitment = nextSetupCommitment(theirCommitment);
  if (ourCommitment === 'NotASetupCommitment') {
    throw new Error('Not a Setup commitment');
  }
  const signResult = signAndStore(sharedData, ourCommitment);
  if (!signResult.isSuccess) {
    return unchangedState;
  }
  sharedData = signResult.store;

  sharedData = registerChannelToMonitor(sharedData, protocolState.processId, ledgerId);

  // just need to put our message in the outbox
  const messageRelay = sendCommitmentReceived(
    theirAddress(channel),
    protocolState.processId,
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
  );
  sharedData = queueMessage(sharedData, messageRelay);
  channel = getChannel(sharedData, ledgerId); // refresh channel

  const total = theirCommitment.allocation.reduce(addHex);
  const theirAmount = theirCommitment.allocation[0];
  const ourAmount = theirCommitment.allocation[1];
  // update the state
  const directFundingAction = directFundingRequested(
    protocolState.processId,
    ledgerId,
    theirAmount,
    total,
    ourAmount,
    1,
  );
  const directFundingState = initialDirectFundingState(directFundingAction, sharedData);
  const newProtocolState = bWaitForDirectFunding({
    ...protocolState,
    ledgerId,
    directFundingState: directFundingState.protocolState,
  });
  sharedData = directFundingState.sharedData;
  return { protocolState: newProtocolState, sharedData };
}

function handleWaitForDirectFunding(
  protocolState: BWaitForDirectFunding,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (protocolState.type !== 'BWaitForDirectFunding') {
    return { protocolState, sharedData };
  }

  const existingDirectFundingState = protocolState.directFundingState;
  const protocolStateWithSharedData = directFundingStateReducer(
    existingDirectFundingState,
    sharedData,
    action,
  );
  // Update direct funding state on our protocol state
  const newDirectFundingState = protocolStateWithSharedData.protocolState;
  const newProtocolState = { ...protocolState, directFundingState: newDirectFundingState };

  if (isSuccess(newDirectFundingState)) {
    return { protocolState: bWaitForLedgerUpdate0(newProtocolState), sharedData };
  } else if (isFailure(newDirectFundingState)) {
    return { protocolState: failure(), sharedData };
  }

  return { protocolState: newProtocolState, sharedData };
}

function handleWaitForLedgerUpdate(
  protocolState: BWaitForLedgerUpdate0,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
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
  let channel = getChannel(sharedData, ledgerId);
  if (!channel || channel.libraryAddress !== CONSENSUS_LIBRARY_ADDRESS) {
    // todo: this could be more robust somehow.
    // Maybe we should generate what we were expecting and compare.
    throw new Error('Bad channel');
  }

  // are we happy that we have the ledger update?
  // if so, we need to craft our reply

  const ourCommitment = acceptConsensus(theirCommitment);

  const signResult = signAndStore(sharedData, ourCommitment);
  if (!signResult.isSuccess) {
    return unchangedState;
  }
  sharedData = signResult.store;

  // just need to put our message in the outbox
  const messageRelay = sendCommitmentReceived(
    theirAddress(channel),
    protocolState.processId,
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
  );
  sharedData = queueMessage(sharedData, messageRelay);
  channel = getChannel(sharedData, ledgerId); // refresh channel

  const newProtocolState = bWaitForPostFundSetup0({
    ...protocolState,
  });
  return { protocolState: newProtocolState, sharedData };
}

export function handleWaitForPostFundSetup(
  protocolState: BWaitForPostFundSetup0,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  // TODO: There is a lot of repetitive code here
  // We should probably refactor and clean this up
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
  const ourCommitment = nextSetupCommitment(theirCommitment);
  if (ourCommitment === 'NotASetupCommitment') {
    throw new Error('Not a Setup commitment');
  }
  const signResult = signAndStore(sharedData, ourCommitment);
  if (!signResult.isSuccess) {
    return unchangedState;
  }
  sharedData = signResult.store;
  // We expect this to be a application post fund setup
  const appId = getChannelId(theirCommitment);
  let channel = getChannel(sharedData, appId);
  if (!channel || channel.libraryAddress === CONSENSUS_LIBRARY_ADDRESS) {
    // todo: this could be more robust somehow.
    // Maybe we should generate what we were expecting and compare.
    throw new Error('Bad channel');
  }
  // just need to put our message in the outbox
  const messageRelay = sendCommitmentReceived(
    theirAddress(channel),
    protocolState.processId,
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
  );
  sharedData = queueMessage(sharedData, messageRelay);
  channel = getChannel(sharedData, appId); // refresh channel

  const newProtocolState = success();
  const newReturnVal = { protocolState: newProtocolState, sharedData };
  return newReturnVal;
}
