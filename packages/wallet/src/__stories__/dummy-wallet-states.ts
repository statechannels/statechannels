import * as walletStates from "../redux/state";
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
  states: [
    {state: preFundState1, signature: "fake-sig"},
    {state: preFundState2, signature: "fake-sig"}
  ],
  turnNum: preFundState2.turnNum,
  networkId: 3,
  challengeExpiry: 0,
  transactionHash: "0x0",
  userAddress: "0x0",
  funded: false
};

////////////////////////////
// WALLET NOT INITIALIZED //
////////////////////////////

export const dummyWaitForLogin: walletStates.WalletState = walletStates.waitForLogin();
export const dummyWaitForMetaMask: walletStates.WalletState = walletStates.metaMaskError({
  ...dummyWaitForLogin
});
//

////////////////////////////
// WALLET INITIALIZED //
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
