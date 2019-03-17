import * as states from '../state';
import * as actions from '../../actions';
import {
  messageRelayRequested,
  fundingSuccess,
  fundingFailure,
  showWallet,
  hideWallet,
  commitmentRelayRequested,
} from 'magmo-wallet-client/lib/wallet-events';

import { unreachable, validTransition } from '../../../utils/reducer-utils';
import { signCommitment, validCommitmentSignature } from '../../../utils/signing-utils';

import { Channel, Commitment, CommitmentType } from 'fmg-core';
import { handleSignatureAndValidationMessages } from '../../../utils/state-utils';
import { NextChannelState } from '../../shared/state';
import { directFundingStateReducer } from '../fundingState/directFunding/reducer';
import { outboxStateReducer } from '../../reducer';
import { FUNDING_CONFIRMED } from '../fundingState/state';

export const fundingReducer = (
  state: states.FundingChannelState,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (
    action.type === actions.OWN_COMMITMENT_RECEIVED ||
    action.type === actions.OPPONENT_COMMITMENT_RECEIVED
  ) {
    return {
      channelState: state,
      outboxState: { messageOutbox: handleSignatureAndValidationMessages(state, action) },
    };
  }

  let outboxState = {};

  // We modify the funding state directly, before applying the rest-of-state reducers.
  // This lets the rest-of-state reducer decide on what side effects they should have based on
  // the outcome of funding-related actions on the current funding status.
  const { fundingState, outboxState: fundingSideEffects } = directFundingStateReducer(
    state.fundingState,
    action,
    state.channelId,
    state.ourIndex,
  );

  state = { ...state, fundingState, funded: fundingState.type === FUNDING_CONFIRMED };

  const {
    channelState: updatedState,
    outboxState: internalReducerSideEffects,
  } = channelStateReducer(state, action);

  // Apply the side effects
  outboxState = outboxStateReducer(outboxState, fundingSideEffects);
  outboxState = outboxStateReducer(outboxState, internalReducerSideEffects);

  return { channelState: updatedState, outboxState };
};

const channelStateReducer = (
  state: states.FundingChannelState,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (state.type) {
    // Setup funding process
    case states.WAIT_FOR_FUNDING_REQUEST:
      return waitForFundingRequestReducer(state, action);
    case states.WAIT_FOR_FUNDING_APPROVAL:
      return approveFundingReducer(state, action);

    // Funding is ongoing
    case states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP:
      return waitForFundingAndPostFundSetupReducer(state, action);
    case states.WAIT_FOR_FUNDING_CONFIRMATION:
      return waitForFundingConfirmationReducer(state, action);
    case states.A_WAIT_FOR_POST_FUND_SETUP:
      return aWaitForPostFundSetupReducer(state, action);
    case states.B_WAIT_FOR_POST_FUND_SETUP:
      return bWaitForPostFundSetupReducer(state, action);

    // Ending the stage
    case states.ACKNOWLEDGE_FUNDING_SUCCESS:
      return acknowledgeFundingSuccessReducer(state, action);
    case states.SEND_FUNDING_DECLINED_MESSAGE:
      return sendFundingDeclinedMessageReducer(state, action);
    case states.ACKNOWLEDGE_FUNDING_DECLINED:
      return acknowledgeFundingDeclinedReducer(state, action);
    //
    default:
      return unreachable(state);
  }
};

const waitForFundingRequestReducer = (
  state: states.WaitForFundingRequest,
  action: actions.WalletAction,
): NextChannelState<states.OpenedChannelState> => {
  switch (action.type) {
    case actions.FUNDING_REQUESTED:
      return {
        channelState: states.approveFunding({ ...state }),
        outboxState: { displayOutbox: showWallet() },
      };
    default:
      return { channelState: state };
  }
};

const approveFundingReducer = (
  state: states.WaitForFundingApproval,
  action: actions.WalletAction,
): NextChannelState<states.OpenedChannelState> => {
  switch (action.type) {
    case actions.FUNDING_APPROVED:
      return {
        channelState: states.waitForFundingAndPostFundSetup(state),
      };
    case actions.FUNDING_REJECTED:
      const sendFundingDeclinedAction = messageRelayRequested(
        state.participants[1 - state.ourIndex],
        'FundingDeclined',
      );
      return {
        channelState: states.sendFundingDeclinedMessage({ ...state }),
        outboxState: { messageOutbox: sendFundingDeclinedAction, displayOutbox: hideWallet() },
      };
    case actions.MESSAGE_RECEIVED:
      if (action.data && action.data === 'FundingDeclined') {
        return { channelState: states.acknowledgeFundingDeclined(state) };
      } else {
        return { channelState: state };
      }
    case actions.FUNDING_DECLINED_ACKNOWLEDGED:
      return { channelState: states.approveFunding({ ...state, unhandledAction: action }) };
    default:
      return { channelState: state };
  }
};

const waitForFundingAndPostFundSetupReducer = (
  state: states.WaitForFundingAndPostFundSetup,
  action: actions.WalletAction,
): NextChannelState<states.OpenedChannelState> => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:
      if (action.data === 'FundingDeclined') {
        return {
          channelState: states.acknowledgeFundingDeclined({ ...state }),
        };
      } else {
        return { channelState: state };
      }
    case actions.COMMITMENT_RECEIVED:
      const { commitment: postFundState, signature: theirSignature } = action;
      if (!validTransitionToPostFundState(state, postFundState, theirSignature)) {
        return { channelState: state };
      }
      if (state.ourIndex === 0) {
        return {
          channelState: states.waitForFundingConfirmation({
            ...state,
            turnNum: postFundState.turnNum,
            lastCommitment: { commitment: postFundState, signature: theirSignature },
            penultimateCommitment: state.lastCommitment,
          }),
        };
      } else {
        const {
          postFundSetupCommitment: commitment,
          commitmentSignature: signature,
          // Don't send the message yet, since funding hasn't been confirmed?
        } = composePostFundCommitment(state);
        return {
          channelState: states.waitForFundingConfirmation({
            ...state,
            turnNum: postFundState.turnNum + 1,
            penultimateCommitment: { commitment: postFundState, signature },
            lastCommitment: { commitment, signature },
          }),
        };
      }

    case actions.FUNDING_RECEIVED_EVENT:
      if (state.funded) {
        const {
          postFundSetupCommitment,
          commitmentSignature,
          sendCommitmentAction,
        } = composePostFundCommitment(state);

        const params = {
          ...state,
          turnNum: postFundSetupCommitment.turnNum,
          penultimateCommitment: state.lastCommitment,
          lastCommitment: {
            commitment: postFundSetupCommitment,
            signature: commitmentSignature,
          },
        };

        if (state.ourIndex === 0) {
          return {
            channelState: states.aWaitForPostFundSetup(params),
            outboxState: {
              messageOutbox: sendCommitmentAction,
            },
          };
        } else {
          return {
            channelState: states.bWaitForPostFundSetup({ ...state }),
            outboxState: {
              messageOutbox: sendCommitmentAction,
            },
          };
        }
      } else {
        return { channelState: state };
      }

    case actions.TRANSACTION_CONFIRMED:
      // WARNING: This is pretty brittle
      if (state.funded) {
        // Player B can now confirm funding and is only waiting on post fund setup
        if (state.ourIndex === 0) {
          return {
            channelState: states.aWaitForPostFundSetup({ ...state }),
          };
        } else {
          return {
            channelState: states.bWaitForPostFundSetup({ ...state }),
          };
        }
      } else {
        return { channelState: state };
      }
    default:
      return { channelState: state };
  }
};

const aWaitForPostFundSetupReducer = (
  state: states.AWaitForPostFundSetup,
  action: actions.WalletAction,
): NextChannelState<states.OpenedChannelState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const { commitment: postFundState, signature } = action;
      if (!validTransitionToPostFundState(state, postFundState, signature)) {
        return { channelState: state };
      }

      if (state.funded) {
        return {
          channelState: states.acknowledgeFundingSuccess({
            ...state,
            turnNum: postFundState.turnNum,
            lastCommitment: { commitment: postFundState, signature },
            penultimateCommitment: state.lastCommitment,
          }),
        };
      } else {
        // This _should_ be unreachable, since you would only arrive in the
        // aWaitForPostFundSetup state after receiving funding confirmation
        return {
          channelState: states.waitForFundingConfirmation({
            ...state,
            turnNum: postFundState.turnNum,
            lastCommitment: { commitment: postFundState, signature },
            penultimateCommitment: state.lastCommitment,
          }),
        };
      }
    default:
      return { channelState: state };
  }
};

const bWaitForPostFundSetupReducer = (
  state: states.BWaitForPostFundSetup,
  action: actions.WalletAction,
): NextChannelState<states.OpenedChannelState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const { commitment, signature } = action;
      if (!validTransitionToPostFundState(state, commitment, signature)) {
        return { channelState: state };
      }

      const newState = { ...state, turnNum: commitment.turnNum };
      const {
        postFundSetupCommitment,
        commitmentSignature,
        sendCommitmentAction,
      } = composePostFundCommitment(newState);
      return {
        channelState: states.acknowledgeFundingSuccess({
          ...newState,
          turnNum: postFundSetupCommitment.turnNum,
          lastCommitment: { commitment: postFundSetupCommitment, signature: commitmentSignature },
          penultimateCommitment: { commitment, signature },
        }),
        outboxState: { messageOutbox: sendCommitmentAction },
      };
    default:
      return { channelState: state };
  }
};

const waitForFundingConfirmationReducer = (
  state: states.WaitForFundingConfirmation,
  action: actions.WalletAction,
): NextChannelState<states.OpenedChannelState> => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
    case actions.TRANSACTION_CONFIRMED:
      if (state.funded) {
        // Since we're in the WaitForFundingConfirmation state, we've already received the
        // opponent's post-fund-setup commitment.
        // However, we haven't sent it yet, so we send it now.
        // We don't need to update the turnNum on state, as it's already been done.
        const { sendCommitmentAction } = composePostFundCommitment(state);
        return {
          channelState: states.acknowledgeFundingSuccess({
            ...state,
          }),
          outboxState: { messageOutbox: sendCommitmentAction },
        };
      } else {
        return { channelState: state };
      }

    default:
      return { channelState: state };
  }
};

const acknowledgeFundingDeclinedReducer = (
  state: states.AcknowledgeFundingDeclined,
  action: actions.WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.FUNDING_DECLINED_ACKNOWLEDGED:
      return {
        channelState: states.waitForChannel({
          ...state,
        }),
        outboxState: {
          messageOutbox: fundingFailure(state.channelId, 'FundingDeclined'),
          displayOutbox: hideWallet(),
        },
      };
  }
  return { channelState: state };
};

const sendFundingDeclinedMessageReducer = (
  state: states.SendFundingDeclinedMessage,
  action: actions.WalletAction,
): NextChannelState<states.WaitForChannel | states.SendFundingDeclinedMessage> => {
  switch (action.type) {
    case actions.MESSAGE_SENT:
      return {
        channelState: states.waitForChannel({
          ...state,
        }),
        outboxState: {
          messageOutbox: fundingFailure(state.channelId, 'FundingDeclined'),
          displayOutbox: hideWallet(),
        },
      };
  }
  return { channelState: state };
};
const acknowledgeFundingSuccessReducer = (
  state: states.AcknowledgeFundingSuccess,
  action: actions.WalletAction,
): NextChannelState<states.OpenedChannelState> => {
  switch (action.type) {
    case actions.FUNDING_SUCCESS_ACKNOWLEDGED:
      return {
        channelState: states.waitForUpdate({
          ...state,
        }),
        outboxState: {
          displayOutbox: hideWallet(),
          messageOutbox: fundingSuccess(state.channelId, state.lastCommitment.commitment),
        },
      };
    default:
      return { channelState: state };
  }
};

const validTransitionToPostFundState = (
  state: states.FundingChannelState,
  data: Commitment,
  signature: string | undefined,
) => {
  if (!signature) {
    return false;
  }

  const opponentAddress = state.participants[1 - state.ourIndex];

  if (!validCommitmentSignature(data, signature, opponentAddress)) {
    return false;
  }
  if (!validTransition(state, data)) {
    return false;
  }
  if (data.commitmentType !== 1) {
    return false;
  }
  return true;
};

const composePostFundCommitment = (
  state:
    | states.WaitForFundingConfirmation
    | states.WaitForFundingAndPostFundSetup
    | states.BWaitForPostFundSetup,
) => {
  const { libraryAddress, channelNonce, participants, turnNum, lastCommitment } = state;
  const channel: Channel = { channelType: libraryAddress, nonce: channelNonce, participants };

  const postFundSetupCommitment: Commitment = {
    channel,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: turnNum + 1,
    commitmentCount: state.ourIndex,
    allocation: lastCommitment.commitment.allocation,
    destination: lastCommitment.commitment.destination,
    appAttributes: state.lastCommitment.commitment.appAttributes,
  };
  const commitmentSignature = signCommitment(postFundSetupCommitment, state.privateKey);

  const sendCommitmentAction = commitmentRelayRequested(
    state.participants[1 - state.ourIndex],
    postFundSetupCommitment,
    commitmentSignature,
  );
  return { postFundSetupCommitment, commitmentSignature, sendCommitmentAction };
};
