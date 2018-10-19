import Web3 from 'web3';
/*
As of November 2, 2018, metamask will introduce a breaking change where it will
no longer inject a connected web3 instance to the browser.

Instead, it will inject an ethereum provider, under the variable `ethereum`.
See: https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
*/

export function connectWeb3() {
  let currentProvider;
  let defaultAccount;
  if (web3) {
    currentProvider = web3.currentProvider;
    defaultAccount = web3.eth.defaultAccount;
  } else if (ethereum) {
    ethereum.enable();
    currentProvider = ethereum.currentProvider;
  } else {
    throw new Error("No provider injected by metamask.");
  }

  const connectedWeb3 = new Web3(currentProvider);
  connectedWeb3.eth.defaultAccount = defaultAccount;

  return connectedWeb3;
}