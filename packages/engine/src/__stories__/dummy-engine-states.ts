import * as engineStates from "../redux/state";
import * as scenarios from "../redux/__tests__/state-helpers";
import * as states from "../redux/state";

const {channelId, channelNonce, libraryAddress, participants} = scenarios;
const preFundState1 = scenarios.appState({turnNum: 0}).state;
const preFundState2 = scenarios.appState({turnNum: 1}).state;
export const defaultParams = {
  adjudicator: "adj-address",
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  uid: "uid",
  states: [{state: preFundState1, signature: "fake-sig"}, {state: preFundState2, signature: "fake-sig"}],
  turnNum: preFundState2.turnNum,
  networkId: 3,
  challengeExpiry: 0,
  transactionHash: "0x0",
  userAddress: "0x0",
  funded: false
};

////////////////////////////
// ENGINE NOT INITIALIZED //
////////////////////////////

export const dummyWaitForLogin: engineStates.EngineState = engineStates.waitForLogin();
export const dummyWaitForMetaMask: engineStates.EngineState = engineStates.metaMaskError({
  ...dummyWaitForLogin
});
//

////////////////////////////
// ENGINE INITIALIZED //
////////////////////////////

const defaults = {
  ...states.EMPTY_SHARED_DATA,
  uid: "uid",
  processStore: {},
  adjudicatorStore: {},
  address: "address",
  privateKey: "privateKey"
};

export const initializedState = states.initialized({...defaults});
