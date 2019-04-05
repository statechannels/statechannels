import * as states from './state';

import { openingReducer } from './opening/reducer';
import { fundingReducer } from './funding/reducer';
import { runningReducer } from './running/reducer';
import { challengingReducer } from './challenging/reducer';
import { respondingReducer } from './responding/reducer';
import { withdrawingReducer } from './withdrawing/reducer';
import { closingReducer } from './closing/reducer';
import * as actions from './actions';
import {
  unreachable,
  ourTurn,
  validTransition,
  ReducerWithSideEffects,
  combineReducersWithSideEffects,
} from '../../utils/reducer-utils';
import { validCommitmentSignature } from '../../utils/signing-utils';
import { showWallet, channelInitializationSuccess } from 'magmo-wallet-client/lib/wallet-events';
import { CommitmentType } from 'fmg-core';
import { StateWithSideEffects } from '../utils';
import { ethers } from 'ethers';
import { channelID } from 'fmg-core/lib/channel';
import { WalletAction, COMMITMENT_RECEIVED } from '../actions';

export const channelStateReducer: ReducerWithSideEffects<states.ChannelState> = (
  state: states.ChannelState,
  action: WalletAction,
): StateWithSideEffects<states.ChannelState> => {
  if (!actions.isChannelAction(action)) {
    return { state };
  }

  const newState = { ...state };
  if (actions.isReceiveFirstCommitment(action)) {
    // We manually select and move the initializing channel into the initializedChannelState
    // before applying the combined reducer, so that the address and private key is in the
    // right slot (by its channelId)
    const channel = action.commitment.channel;
    const channelId = channelID(channel);
    if (newState.initializedChannels[channelId]) {
      throw new Error('Channel already exists');
    }
    const initializingAddresses = new Set(Object.keys(newState.initializingChannels));
    const ourAddress = channel.participants.find(addr => initializingAddresses.has(addr));
    if (!ourAddress) {
      return { state: newState };
    }
    const ourIndex = channel.participants.indexOf(ourAddress);

    const { address, privateKey } = newState.initializingChannels[ourAddress];
    delete newState.initializingChannels[ourAddress];
    newState.initializedChannels[channelId] = states.waitForChannel({
      address,
      privateKey,
      ourIndex,
    });

    // Since the wallet only manages one channel at a time, when it receives the first
    // prefundsetup commitment for a channel, from the application, we set the
    // activeAppChannelId accordingly.
    // In the future, the application might need to specify the intended channel id
    // for the action
    newState.activeAppChannelId = channelId;
  }

  return combinedReducer(newState, action, {
    initializedChannels: { appChannelId: newState.activeAppChannelId },
  });
};

const initializingChannels: ReducerWithSideEffects<states.InitializingChannelState> = (
  state: states.InitializingChannelState,
  action: actions.ChannelAction,
): StateWithSideEffects<states.InitializingChannelState> => {
  if (action.type !== actions.CHANNEL_INITIALIZED) {
    return { state };
  }

  const wallet = ethers.Wallet.createRandom();
  const { address, privateKey } = wallet;
  return {
    state: {
      ...state,
      // We have to temporarily store the private key under the address, since
      // we can't know the channel id until both participants know their addresses.
      [address]: states.waitForChannel({ address, privateKey }),
    },
    sideEffects: { messageOutbox: channelInitializationSuccess(wallet.address) },
  };
};

const initializedChannels: ReducerWithSideEffects<states.InitializedChannelState> = (
  state: states.InitializedChannelState,
  action: actions.ChannelAction,
  data: { appChannelId: string },
): StateWithSideEffects<states.InitializedChannelState> => {
  if (action.type === actions.CHANNEL_INITIALIZED) {
    return { state };
  }

  // If an action has a channelId/commitment we update the channel state for that channel
  let channelId = data.appChannelId;
  if ('channelId' in action) {
    channelId = action.channelId;
  } else if ('commitment' in action) {
    channelId = channelID(action.commitment.channel);
  }

  const existingChannel = state[channelId];
  if (!existingChannel) {
    // TODO:  This channel should really exist -- should we throw?
    return { state };
  }

  const { state: newState, sideEffects: outboxState } = initializedChannelStatusReducer(
    existingChannel,
    action,
  );

  return { state: { ...state, [channelId]: newState }, sideEffects: outboxState };
};

export const initializedChannelStatusReducer: ReducerWithSideEffects<states.ChannelStatus> = (
  state: states.ChannelStatus,
  action: actions.ChannelAction,
): StateWithSideEffects<states.ChannelStatus> => {
  const conclusionStateFromOwnRequest = receivedValidOwnConclusionRequest(state, action);
  if (conclusionStateFromOwnRequest) {
    return {
      state: conclusionStateFromOwnRequest,
      sideEffects: { displayOutbox: showWallet() },
    };
  }

  const conclusionStateFromOpponentRequest = receivedValidOpponentConclusionRequest(state, action);
  if (conclusionStateFromOpponentRequest) {
    return {
      state: conclusionStateFromOpponentRequest,
      sideEffects: { displayOutbox: showWallet() },
    };
  }

  switch (state.stage) {
    case states.OPENING:
      return openingReducer(state, action);
    case states.FUNDING:
      return fundingReducer(state, action);
    case states.RUNNING:
      return runningReducer(state, action);
    case states.CHALLENGING:
      return challengingReducer(state, action);
    case states.RESPONDING:
      return respondingReducer(state, action);
    case states.WITHDRAWING:
      return withdrawingReducer(state, action);
    case states.CLOSING:
      return closingReducer(state, action);
    default:
      return unreachable(state);
  }
};

const combinedReducer = combineReducersWithSideEffects({
  initializingChannels,
  initializedChannels,
});

const receivedValidOwnConclusionRequest = (
  state: states.ChannelStatus,
  action: actions.ChannelAction,
): states.ApproveConclude | null => {
  if (state.stage !== states.FUNDING && state.stage !== states.RUNNING) {
    return null;
  }
  if (action.type !== actions.CONCLUDE_REQUESTED || !ourTurn(state)) {
    return null;
  }
  return states.approveConclude({ ...state });
};

const receivedValidOpponentConclusionRequest = (
  state: states.ChannelStatus,
  action: actions.ChannelAction,
): states.AcknowledgeConclude | null => {
  if (state.stage !== states.FUNDING && state.stage !== states.RUNNING) {
    return null;
  }
  if (action.type !== COMMITMENT_RECEIVED) {
    return null;
  }

  const { commitment, signature } = action;

  if (commitment.commitmentType !== CommitmentType.Conclude) {
    return null;
  }
  // check signature
  const opponentAddress = state.participants[1 - state.ourIndex];
  if (!validCommitmentSignature(commitment, signature, opponentAddress)) {
    return null;
  }
  if (!validTransition(state, commitment)) {
    return null;
  }

  return states.acknowledgeConclude({
    ...state,
    turnNum: commitment.turnNum,
    lastCommitment: { commitment, signature },
    penultimateCommitment: state.lastCommitment,
  });
};
