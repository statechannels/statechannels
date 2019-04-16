import * as walletStates from '../redux/state';
import * as scenarios from '../redux/__tests__/test-scenarios';

const {
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  preFundCommitment1,
  preFundCommitment2,
} = scenarios;

export const defaultParams = {
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  uid: 'uid',
  lastCommitment: { commitment: preFundCommitment2, signature: 'fake-sig' },
  penultimateCommitment: { commitment: preFundCommitment1, signature: 'fake-sig' },
  turnNum: preFundCommitment2.turnNum,
  networkId: 3,
  challengeExpiry: 0,
  transactionHash: '0x0',
  userAddress: '0x0',
  funded: false,
};

////////////////////////////
// WALLET NOT INITIALIZED //
////////////////////////////

export const dummyWaitForLogin: walletStates.WalletState = walletStates.waitForLogin();
export const dummyWaitForMetaMask: walletStates.WalletState = walletStates.metaMaskError({
  ...dummyWaitForLogin,
});
//
