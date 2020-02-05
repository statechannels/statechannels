import {select, call} from "redux-saga/effects";

import {BigNumber} from "ethers/utils";

import * as selectors from "../selectors";
import {
  getProvider,
  getETHAssetHolderHoldings,
  getERC20AssetHolderHoldings
} from "../../utils/contract-utils";

// import {channelUpdate} from "../actions";

import {ETH_ASSET_HOLDER_ADDRESS, ERC20_ASSET_HOLDER_ADDRESS} from "../../constants";

// A simple saga that runs and dispatches update actions to load the latest adjudicator state
export function* assetHolderStateUpdater() {
  const channelIds = yield select(selectors.getChannelIds);
  const provider = yield call(getProvider);
  for (const channelId of channelIds) {
    const assetHolderAddress = yield select(selectors.getAssetHolderAddress, channelId);
    const getter = {
      [ETH_ASSET_HOLDER_ADDRESS]: getETHAssetHolderHoldings,
      [ERC20_ASSET_HOLDER_ADDRESS]: getERC20AssetHolderHoldings
    }[assetHolderAddress];
    const holdings: BigNumber = yield call(getter[assetHolderAddress], provider, channelId);
    console.info(assetHolderAddress, channelId, holdings);
    // yield put( <TODO: make an action > );
  }
}
