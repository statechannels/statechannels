// import * as selectors from "../selectors";
// import {select, call, put} from "redux-saga/effects";
// import {getProvider, getAdjudicatorChannelStorageHash} from "../../utils/contract-utils";
// import {channelUpdate} from "../actions";
// import {bigNumberify} from "ethers/utils";

// // A simple saga that runs and dispatches update actions to load the latest adjudicator state
export function* adjudicatorStateUpdater() {
  //   const channelIds = yield select(selectors.getChannelIds);
  //   const provider = yield call(getProvider);
  //   for (const channelId of channelIds) {
  //     // const channelStorageHash = yield call(getAdjudicatorChannelStorageHash, provider, channelId);
  //     //
  //     // const isFinalzied = ...
  //     //
  //     // TODO: To determine if this channel is in a "finalized" state we must learn about the most recent
  //     // ChannelStorage object that has been put on chain by filtering all events since the most recently
  //     // observed block of the wallet of any of these types:
  //     // - ChallengeRegistered
  //     // - ChallengeCleared
  //     // - Concluded
  //     // Then, based on the most recent one, understand the state that the channel is now in. If it is
  //     // not explicitly finalized, then we should check the current block number to determine if it is.
  //     // We can confirm our hypothesis by checking `channelStorageHash` against the hash of our guess.
  //     //
  //     // yield put(channelUpdate({channelId, isFinalized}));
  //   }
}
