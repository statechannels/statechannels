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
import { validCommitmentSignature, signCommitment } from '../../utils/signing-utils';
import {
  showWallet,
  channelInitializationSuccess,
  signatureFailure,
  signatureSuccess,
  validationFailure,
  validationSuccess,
} from 'magmo-wallet-client/lib/wallet-events';
import { CommitmentType } from 'fmg-core';
import { StateWithSideEffects } from '../utils';
import { ethers } from 'ethers';
import { channelID } from 'fmg-core/lib/channel';
import { WalletAction, COMMITMENT_RECEIVED } from '../actions';
import { Commitment } from 'fmg-core';

export const channelStateReducer: ReducerWithSideEffects<states.ChannelState> = (
  state: states.ChannelState,
  action: WalletAction,
): StateWithSideEffects<states.ChannelState> => {
  const newState = { ...state };
  if (actions.isReceiveFirstCommitment(action) && !channelIsInitialized(action.commitment, state)) {
    return handleFirstCommmit(state, action);
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
      [address]: { address, privateKey },
    },
    sideEffects: { messageOutbox: channelInitializationSuccess(wallet.address) },
  };
};

type CommitmentReceived = actions.OwnCommitmentReceived | actions.OpponentCommitmentReceived;
const handleFirstCommmit = (
  state: states.ChannelState,
  action: CommitmentReceived,
): StateWithSideEffects<states.ChannelState> => {
  // We manually select and move the initializing channel into the initializedChannelState
  // before applying the combined reducer, so that the address and private key is in the
  // right slot (by its channelId)
  const channel = action.commitment.channel;
  const channelId = channelID(channel);
  if (state.initializedChannels[channelId]) {
    throw new Error('Channel already exists');
  }
  const initializingAddresses = new Set(Object.keys(state.initializingChannels));
  const ourAddress = channel.participants.find(addr => initializingAddresses.has(addr));
  if (!ourAddress) {
    return { state };
  }
  const ourIndex = channel.participants.indexOf(ourAddress);

  const { address, privateKey } = state.initializingChannels[ourAddress];
  delete state.initializingChannels[ourAddress];

  // Since the wallet only manages one channel at a time, when it receives the first
  // prefundsetup commitment for a channel, from the application, we set the
  // activeAppChannelId accordingly.
  // In the future, the application might need to specify the intended channel id
  // for the action
  state.activeAppChannelId = channelId;

  const channelState = {
    address,
    privateKey,
    ourIndex,
  };

  switch (action.type) {
    case actions.OWN_COMMITMENT_RECEIVED:
      const ownCommitment = action.commitment;

      // check it's a PreFundSetupA
      if (ownCommitment.commitmentType !== CommitmentType.PreFundSetup) {
        // Since these checks are happening during a signature request we'll return a sig failure
        return {
          state,
          sideEffects: {
            messageOutbox: signatureFailure('Other', 'Expected a pre fund setup position.'),
          },
        };
      }
      if (ownCommitment.commitmentCount !== 0) {
        return {
          state,
          sideEffects: { messageOutbox: signatureFailure('Other', 'Expected state count to 0.') },
        };
      }

      if (ourAddress !== channelState.address) {
        return {
          state,
          sideEffects: {
            messageOutbox: signatureFailure(
              'Other',
              'Address provided does not match the one stored in the wallet.',
            ),
          },
        };
      }

      const signature = signCommitment(ownCommitment, channelState.privateKey);
      // if so, unpack its contents into the state
      return {
        state: states.setChannel(
          state,
          states.waitForPreFundSetup({
            ...channelState,
            libraryAddress: ownCommitment.channel.channelType,
            channelId: channelID(ownCommitment.channel),
            ourIndex: ownCommitment.channel.participants.indexOf(channelState.address),
            participants: ownCommitment.channel.participants as [string, string],
            channelNonce: ownCommitment.channel.nonce,
            turnNum: 0,
            lastCommitment: { commitment: ownCommitment, signature },
            funded: false,
          }),
        ),
        sideEffects: { messageOutbox: signatureSuccess(signature) },
      };

    case actions.OPPONENT_COMMITMENT_RECEIVED:
      const opponentCommitment = action.commitment;

      // all these checks will fail silently for the time being
      // check it's a PreFundSetupA
      if (opponentCommitment.commitmentType !== CommitmentType.PreFundSetup) {
        return {
          state,
          sideEffects: {
            messageOutbox: validationFailure('Other', 'Expected a prefund setup position'),
          },
        };
      }
      if (opponentCommitment.commitmentCount !== 0) {
        return {
          state,
          sideEffects: {
            messageOutbox: validationFailure('Other', 'Expected state count to be 0'),
          },
        };
      }

      const ourAddress2 = opponentCommitment.channel.participants[1];
      const opponentAddress2 = opponentCommitment.channel.participants[0] as string;

      if (!validCommitmentSignature(action.commitment, action.signature, opponentAddress2)) {
        return {
          state,
          sideEffects: { messageOutbox: validationFailure('InvalidSignature') },
        };
      }

      if (ourAddress2 !== channelState.address) {
        return {
          state,
          sideEffects: {
            messageOutbox: validationFailure(
              'Other',
              'Address provided does not match the one stored in the wallet.',
            ),
          },
        };
      }

      // if so, unpack its contents into the state
      return {
        state: states.setChannel(
          state,
          states.waitForPreFundSetup({
            ...channelState,
            libraryAddress: opponentCommitment.channel.channelType,
            channelId: channelID(opponentCommitment.channel),
            ourIndex: opponentCommitment.channel.participants.indexOf(channelState.address),
            participants: opponentCommitment.channel.participants as [string, string],
            channelNonce: opponentCommitment.channel.nonce,
            turnNum: 0,
            lastCommitment: { commitment: action.commitment, signature: action.signature },
            funded: false,
          }),
        ),
        sideEffects: { messageOutbox: validationSuccess() },
      };
  }
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
    // return a signature failure
    return {
      state,
      sideEffects: {
        messageOutbox: signatureFailure(
          'Other',
          `Wallet doesn't have an initialized channel for the provided commitment.
          Expected a pre fund setup commitment.`,
        ),
      },
    };
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

const channelIsInitialized = (commitment: Commitment, state: states.ChannelState): boolean => {
  const channelId = channelID(commitment.channel);
  return channelId in state.initializedChannels;
};
