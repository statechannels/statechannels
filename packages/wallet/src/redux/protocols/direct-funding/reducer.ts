import {bigNumberify} from "ethers/utils";

import {unreachable} from "../../../utils/reducer-utils";
import {
  createETHDepositTransaction,
  createERC20DepositTransaction
} from "../../../utils/transaction-generator";
import * as actions from "../../actions";
import {ProtocolReducer, ProtocolStateWithSharedData} from "../../protocols";
import {SharedData, registerChannelToMonitor} from "../../state";
import {isTransactionAction} from "../transaction-submission/actions";
import {
  initialize as initTransactionState,
  transactionReducer
} from "../transaction-submission/reducer";
import {isTerminal, isSuccess} from "../transaction-submission/states";

import {TwoPartyPlayerIndex} from "../../types";
import {ProtocolLocator} from "../../../communication";
import {ETH_ASSET_HOLDER_ADDRESS, ERC20_ASSET_HOLDER_ADDRESS} from "../../../constants";
import {TransactionRequestWithTarget} from "../../outbox/state";

import * as states from "./states";

type DFReducer = ProtocolReducer<states.DirectFundingState>;

export function initialize({
  safeToDepositLevel,
  assetHolderAddress,
  totalFundingRequired,
  requiredDeposit,
  channelId,
  ourIndex,
  processId,
  protocolLocator,
  sharedData
}: {
  sharedData: SharedData;
  safeToDepositLevel: string;
  assetHolderAddress: string;
  totalFundingRequired: string;
  requiredDeposit: string;
  channelId: string;
  ourIndex: TwoPartyPlayerIndex;
  processId: string;
  protocolLocator: ProtocolLocator;
}): ProtocolStateWithSharedData<states.DirectFundingState> {
  sharedData = registerChannelToMonitor(sharedData, channelId, processId, protocolLocator);
  const existingChannelFunding = "0x0"; // FIXME: The wallet has no way of determining funding levels atm
  const alreadySafeToDeposit = bigNumberify(existingChannelFunding).gte(safeToDepositLevel);
  const alreadyFunded = bigNumberify(totalFundingRequired).eq("0x");
  const depositNotRequired = bigNumberify(requiredDeposit).eq("0x");

  if (alreadyFunded) {
    return {
      protocolState: states.fundingSuccess({
        processId,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
        protocolLocator
      }),
      sharedData
    };
  }
  if (depositNotRequired) {
    return {
      protocolState: states.waitForFunding({
        processId,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
        protocolLocator
      }),
      sharedData
    };
  }

  if (alreadySafeToDeposit) {
    let depositTransaction: TransactionRequestWithTarget;

    if (assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS) {
      depositTransaction = createETHDepositTransaction(
        channelId,
        requiredDeposit,
        existingChannelFunding
      );
    } else if (assetHolderAddress === ERC20_ASSET_HOLDER_ADDRESS) {
      depositTransaction = createERC20DepositTransaction(
        channelId,
        requiredDeposit,
        existingChannelFunding
      );
    } else {
      throw new Error(`Received unknown assetHolderAddress: ${assetHolderAddress}`);
    }

    const {storage: newStorage, state: transactionSubmissionState} = initTransactionState(
      depositTransaction,
      processId,
      channelId,
      sharedData
    );

    return {
      protocolState: states.waitForDepositTransaction({
        processId,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
        safeToDepositLevel,
        transactionSubmissionState,
        protocolLocator,
        funded: false
      }),
      sharedData: newStorage
    };
  }

  return {
    protocolState: states.notSafeToDeposit({
      processId,
      totalFundingRequired,
      requiredDeposit,
      channelId,
      ourIndex,
      safeToDepositLevel,
      protocolLocator
    }),
    sharedData
  };
}

export const directFundingStateReducer: DFReducer = (
  state: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.WalletAction
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (action.type === "WALLET.ASSET_HOLDER.DEPOSITED" && action.destination === state.channelId) {
    if (bigNumberify(action.destinationHoldings).gte(state.totalFundingRequired)) {
      return fundingConfirmedReducer(state, sharedData, action);
    }
  }

  switch (state.type) {
    case "DirectFunding.NotSafeToDeposit":
      return notSafeToDepositReducer(state, sharedData, action);
    case "DirectFunding.WaitForDepositTransaction":
      return waitForDepositTransactionReducer(state, sharedData, action);
    case "DirectFunding.WaitForFunding":
      return waitForFundingReducer(state, sharedData, action);
    case "DirectFunding.FundingSuccess":
      return channelFundedReducer(state, sharedData, action);
    case "DirectFunding.FundingFailure":
      // todo: restrict the reducer to only accept non-terminal states
      return {protocolState: state, sharedData};
    default:
      return unreachable(state);
  }
};

// Action reducers
const fundingConfirmedReducer: DFReducer = (
  protocolState: states.DirectFundingState,
  sharedData: SharedData
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  // TODO[Channel state side effect]: update funding level for the channel.

  return {
    protocolState: states.fundingSuccess(protocolState),
    sharedData
  };
};

// State reducers
const notSafeToDepositReducer: DFReducer = (
  state: states.NotSafeToDeposit,
  sharedData: SharedData,
  action: actions.WalletAction
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  switch (action.type) {
    case "WALLET.ASSET_HOLDER.DEPOSITED":
      if (
        action.destination === state.channelId &&
        bigNumberify(action.destinationHoldings).gte(state.safeToDepositLevel)
      ) {
        // FIXME: The wallet has no way of determining funding levels atm
        const existingChannelFunding = action.destinationHoldings.toHexString();
        const depositTransaction = createETHDepositTransaction(
          state.channelId,
          state.requiredDeposit,
          existingChannelFunding
        );

        const {
          storage: sharedDataWithTransactionState,
          state: transactionSubmissionState
        } = initTransactionState(depositTransaction, state.processId, state.channelId, sharedData);
        return {
          protocolState: states.waitForDepositTransaction({
            ...state,
            transactionSubmissionState,
            funded: false
          }),
          sharedData: sharedDataWithTransactionState
        };
      } else {
        return {protocolState: state, sharedData};
      }
    default:
      return {protocolState: state, sharedData};
  }
};

const waitForDepositTransactionReducer: DFReducer = (
  protocolState: states.WaitForDepositTransaction,
  sharedData: SharedData,
  action: actions.WalletAction
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (action.type === "WALLET.ASSET_HOLDER.DEPOSITED") {
    return {protocolState: {...protocolState, funded: true}, sharedData};
  }
  if (!isTransactionAction(action)) {
    console.warn(`Expected Transaction action or funding received, received ${action.type}`);
    return {protocolState, sharedData};
  }
  const {storage: sharedDataWithTransactionUpdate, state: newTransactionState} = transactionReducer(
    protocolState.transactionSubmissionState,
    sharedData,
    action
  );
  if (!isTerminal(newTransactionState)) {
    return {
      sharedData: sharedDataWithTransactionUpdate,
      protocolState: {...protocolState, transactionSubmissionState: newTransactionState}
    };
  } else {
    if (isSuccess(newTransactionState)) {
      if (protocolState.funded) {
        return {protocolState: states.fundingSuccess({...protocolState}), sharedData};
      }
      return {
        protocolState: states.waitForFunding(protocolState),
        sharedData
      };
    } else {
      return {protocolState: states.fundingFailure(protocolState), sharedData};
    }
  }
};

const waitForFundingReducer: DFReducer = (
  protocolState: states.WaitForFunding,
  sharedData: SharedData
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  return {protocolState, sharedData};
};

const channelFundedReducer: DFReducer = (
  state: states.FundingSuccess,
  sharedData: SharedData,
  action: actions.WalletAction
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (action.type === "WALLET.ASSET_HOLDER.DEPOSITED") {
    if (bigNumberify(action.destinationHoldings).lt(state.totalFundingRequired)) {
      // TODO: Deal with chain re-orgs that de-fund the channel here
      return {protocolState: state, sharedData};
    }
  }
  return {protocolState: state, sharedData};
};
