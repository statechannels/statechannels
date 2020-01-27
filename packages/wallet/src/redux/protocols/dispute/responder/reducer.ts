import {ProtocolStateWithSharedData} from "../..";
import * as states from "./states";
import * as actions from "./actions";
import {unreachable} from "../../../../utils/reducer-utils";
import * as selectors from "../../../selectors";
import * as TransactionGenerator from "../../../../utils/transaction-generator";
import {TwoPartyPlayerIndex} from "../../../types";
import {
  initialize as initTransactionState,
  transactionReducer
} from "../../transaction-submission/reducer";
import {SharedData, registerChannelToMonitor, signAndStore} from "../../../state";
import {isTransactionAction} from "../../transaction-submission/actions";
import {
  isTerminal,
  TransactionSubmissionState,
  isSuccess
} from "../../transaction-submission/states";

import {
  showWallet,
  hideWallet,
  sendChallengeResponseRequested,
  sendChallengeComplete,
  sendOpponentConcluded
} from "../../reducer-helpers";
import {ProtocolAction} from "../../../actions";
import * as _ from "lodash";
import {State, getChannelId, SignedState} from "@statechannels/nitro-protocol";
import {TransactionRequestWithTarget} from "../../../outbox/state";
import {ADJUDICATOR_ADDRESS} from "../../../../constants";
export const initialize = (
  processId: string,
  channelId: string,
  expiryTime: number,
  sharedData: SharedData,
  challengeState: State
): ProtocolStateWithSharedData<states.ResponderState> => {
  return {
    protocolState: states.waitForApproval({
      processId,
      channelId,
      challengeState,
      expiryTime
    }),
    sharedData: showWallet(
      registerChannelToMonitor(
        sendChallengeResponseRequested(sharedData),
        processId,
        channelId,
        [] // TODO: This should be passed a protocol locator
      )
    )
  };
};

export const responderReducer = (
  protocolState: states.ResponderState,
  sharedData: SharedData,
  action: ProtocolAction
): ProtocolStateWithSharedData<states.ResponderState> => {
  if (!actions.isResponderAction(action)) {
    console.warn(`Challenge Responding Reducer called with non responding action ${action.type}`);
    return {protocolState, sharedData};
  }
  switch (protocolState.type) {
    case "Responding.WaitForApproval":
      return waitForApprovalReducer(protocolState, sharedData, action);
    case "Responding.WaitForAcknowledgement":
      return waitForAcknowledgementReducer(protocolState, sharedData, action);
    case "Responding.WaitForResponse":
      return waitForResponseReducer(protocolState, sharedData, action);
    case "Responding.WaitForTransaction":
      return waitForTransactionReducer(protocolState, sharedData, action);
    case "Responding.AcknowledgeTimeout":
      return acknowledgeTimeoutReducer(protocolState, sharedData, action);
    case "Responding.Success":
    case "Responding.Failure":
      return {protocolState, sharedData};
    default:
      return unreachable(protocolState);
  }
};

const waitForTransactionReducer = (
  protocolState: states.WaitForTransaction,
  sharedData: SharedData,
  action: actions.ResponderAction
): ProtocolStateWithSharedData<states.ResponderState> => {
  if (action.type === "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED") {
    return {
      protocolState: states.acknowledgeTimeout({...protocolState}),
      sharedData: sendOpponentConcluded(sharedData)
    };
  }
  if (!isTransactionAction(action)) {
    return {sharedData, protocolState};
  }
  const {storage: newSharedData, state: newTransactionState} = transactionReducer(
    protocolState.transactionSubmissionState,
    sharedData,
    action
  );
  if (!isTerminal(newTransactionState)) {
    return {
      sharedData: newSharedData,
      protocolState: {...protocolState, transactionSubmissionState: newTransactionState}
    };
  } else {
    return handleTransactionSubmissionComplete(protocolState, newTransactionState, newSharedData);
  }
};

const waitForResponseReducer = (
  protocolState: states.WaitForResponse,
  sharedData: SharedData,
  action: actions.ResponderAction
): ProtocolStateWithSharedData<states.ResponderState> => {
  switch (action.type) {
    case "WALLET.DISPUTE.RESPONDER.RESPONSE_PROVIDED":
      const {state} = action;
      const signResult = signAndStore(sharedData, state);
      if (!signResult.isSuccess) {
        throw new Error(`Could not sign response state due to ${signResult.reason}`);
      }

      // TODO: There has got to be a better way of finding "the state I am responding to"
      const {signedStates} = sharedData.channelStore[getChannelId(state.channel)];
      const {state: challengeState} = signedStates.find(
        c => c.state.turnNum === signResult.signedState.state.turnNum - 1
      )!;

      const transaction = TransactionGenerator.createRespondTransaction(
        challengeState,
        signResult.signedState
      );

      return transitionToWaitForTransaction(transaction, protocolState, signResult.store);
    case "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED":
      return {
        protocolState: states.acknowledgeTimeout({...protocolState}),
        sharedData: showWallet(sendOpponentConcluded(sharedData))
      };

    default:
      return {protocolState, sharedData};
  }
};

const waitForAcknowledgementReducer = (
  protocolState: states.WaitForAcknowledgement,
  sharedData: SharedData,
  action: actions.ResponderAction
): ProtocolStateWithSharedData<states.ResponderState> => {
  switch (action.type) {
    case "WALLET.DISPUTE.RESPONDER.ACKNOWLEDGED":
      return {
        protocolState: states.success({}),
        sharedData: sendChallengeComplete(hideWallet(sharedData), protocolState.channelId)
      };
    default:
      return {protocolState, sharedData};
  }
};

const waitForApprovalReducer = (
  protocolState: states.WaitForApproval,
  sharedData: SharedData,
  action: actions.ResponderAction
): ProtocolStateWithSharedData<states.ResponderState> => {
  switch (action.type) {
    case "WALLET.DISPUTE.RESPONDER.RESPOND_APPROVED":
      const {challengeState, processId} = protocolState;
      if (!canRespondWithExistingState(protocolState.challengeState, sharedData)) {
        return {
          protocolState: states.waitForResponse(protocolState),
          sharedData: hideWallet(sharedData)
        };
      } else {
        const transaction = craftResponseTransactionWithExistingState(
          processId,
          challengeState,
          sharedData
        );

        return transitionToWaitForTransaction(transaction, protocolState, sharedData);
      }
    case "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED":
      return {
        protocolState: states.acknowledgeTimeout({...protocolState}),
        sharedData: sendOpponentConcluded(sharedData)
      };

    default:
      return {protocolState, sharedData};
  }
};

function acknowledgeTimeoutReducer(
  protocolState: states.AcknowledgeTimeout,
  sharedData: SharedData,
  action: actions.ResponderAction
): ProtocolStateWithSharedData<states.ResponderState> {
  if (action.type === "WALLET.DISPUTE.RESPONDER.ACKNOWLEDGED") {
    return {
      protocolState: states.failure({reason: states.FailureReason.TimeOut}),
      sharedData: hideWallet(sharedData)
    };
  }
  if (action.type === "WALLET.DISPUTE.CHALLENGER.EXIT_CHALLENGE") {
    return {
      protocolState: states.failure({reason: states.FailureReason.TimeOut}),
      sharedData
    };
  }
  return {
    protocolState,
    sharedData
  };
}

// helpers
const handleTransactionSubmissionComplete = (
  protocolState: states.WaitForTransaction,
  transactionState: TransactionSubmissionState,
  sharedData: SharedData
) => {
  if (isSuccess(transactionState)) {
    return {
      protocolState: states.waitForAcknowledgement(protocolState),
      sharedData
    };
  } else {
    return {
      protocolState: states.failure({reason: states.FailureReason.TransactionFailure}),
      sharedData
    };
  }
};

const transitionToWaitForTransaction = (
  transaction: TransactionRequestWithTarget,
  protocolState: states.WaitForResponse | states.WaitForApproval,
  sharedData: SharedData
) => {
  const {processId, channelId} = protocolState;
  const {storage: newSharedData, state: transactionSubmissionState} = initTransactionState(
    transaction,
    processId,
    channelId,
    sharedData
  );
  const newProtocolState = states.waitForTransaction({
    ...protocolState,
    transactionSubmissionState
  });
  return {
    protocolState: newProtocolState,
    sharedData: showWallet(newSharedData)
  };
};

const craftResponseTransactionWithExistingState = (
  processId: string,
  challengeState: State,
  sharedData: SharedData
): TransactionRequestWithTarget => {
  const {penultimateSignedState, lastSignedState} = getStoredStates(challengeState, sharedData);

  // TODO: Check to see if we need to pass in an array of n-states e.g., if the thing to refute
  // involves a "respond with alternative" basically
  if (canRefute(challengeState, sharedData)) {
    return {
      ...TransactionGenerator.createRefuteTransaction([penultimateSignedState, lastSignedState]),
      to: ADJUDICATOR_ADDRESS
    };
  } else if (canRespondWithExistingState(challengeState, sharedData)) {
    return {
      ...TransactionGenerator.createRespondTransaction(challengeState, lastSignedState),
      to: ADJUDICATOR_ADDRESS
    };
  } else {
    // TODO: We should never actually hit this, currently a sanity check to help out debugging
    throw new Error("Cannot refute or respond with existing state.");
  }
};

const getStoredStates = (
  challengeState: State,
  sharedData: SharedData
): {
  lastSignedState: SignedState;
  penultimateSignedState: SignedState;
} => {
  const channelId = getChannelId(challengeState.channel);
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  // NOTE: Assumes 2-party
  const [penultimateSignedState, lastSignedState] = channelState.signedStates;

  return {penultimateSignedState, lastSignedState};
};

const canRespondWithExistingState = (challengeState: State, sharedData: SharedData) => {
  return (
    canRespondWithExistingMove(challengeState, sharedData) || canRefute(challengeState, sharedData)
  );
};
const canRespondWithExistingMove = (challengeState: State, sharedData: SharedData): boolean => {
  const {penultimateSignedState, lastSignedState} = getStoredStates(challengeState, sharedData);

  return (
    _.isEqual(penultimateSignedState.state, challengeState) &&
    mover(lastSignedState.state) !== mover(challengeState)
  );
};

const canRefute = (challengeState: State, sharedData: SharedData) => {
  const {penultimateSignedState, lastSignedState} = getStoredStates(challengeState, sharedData);

  return (
    canRefuteWithState(lastSignedState.state, challengeState) ||
    canRefuteWithState(penultimateSignedState.state, challengeState)
  );
};

const canRefuteWithState = (state: State, challengeState: State) => {
  return state.turnNum > challengeState.turnNum && mover(state) === mover(challengeState);
};

const mover = (state: State): TwoPartyPlayerIndex => {
  return state.turnNum % 2;
};
