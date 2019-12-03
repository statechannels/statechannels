import {AssetHolderEventAction, DepositedEvent, AssetTransferredEvent} from "../actions";
import {unreachable} from "../../utils/reducer-utils";

import {AssetHoldersState, recordDeposit, recordAssetTransfer} from "./state";

export const assetHolderStateReducer = (
  state: AssetHoldersState,
  action: AssetHolderEventAction
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

const depositedReducer = (state: AssetHoldersState, action: DepositedEvent) => {
  return recordDeposit(
    state,
    action.assetHolderAddress,
    action.destination,
    action.destinationHoldings
  );
};

const assetTransferredReducer = (
  state: AssetHoldersState,
  {assetHolderAddress, channelId, destination, amount}: AssetTransferredEvent
) => {
  return recordAssetTransfer(state, assetHolderAddress, channelId, destination, amount);
};
