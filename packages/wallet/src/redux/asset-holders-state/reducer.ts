import {AssetHoldersState, recordDeposit, recordAssetTransfer} from "./state";
import * as actions from "../actions";
import {unreachable} from "../../utils/reducer-utils";

export const assetHolderStateReducer = (
  state: AssetHoldersState,
  action: actions.AssetHolderEventAction
): AssetHoldersState => {
  switch (action.type) {
    case "WALLET.ASSET_HOLDER.ASSET_TRANSFERRED":
      return assetTransferredReducer(state, action);
    case "WALLET.ASSET_HOLDER.DEPOSITED":
      return depositedReducer(state, action);
    default:
      return unreachable(action);
  }
};

const depositedReducer = (state: AssetHoldersState, action: actions.DepositedEvent) => {
  return recordDeposit(
    state,
    action.assetHolderAddress,
    action.destination,
    action.destinationHoldings
  );
};

const assetTransferredReducer = (
  state: AssetHoldersState,
  action: actions.AssetTransferredEvent
) => {
  return recordAssetTransfer(
    state,
    action.assetHolderAddress,
    action.origin,
    action.destination,
    action.amount
  );
};
