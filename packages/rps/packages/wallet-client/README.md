# `wallet-client`

> A library for creating and interacting with a Magmo wallet.

## Usage
### Creating the Wallet iframe
The wallet iframe can be created by calling `createWalletIFrame` and then embedded anywhere in the page.
The wallet handles stying and displaying itself!
```
const walletClient = require('wallet-client');
const walletIframe = walletClient.createWalletIFrame('magmo-wallet-00');
```
### Listening for Wallet events
The `WalletEventListener` can be used to subscribe to `WalletEvent`s.
```
const walletClient = require('wallet-client');
const walletListener = new walletClient.WalletEventListener();
walletListener.subscribeAll(yourHandler);
```
### Wallet functions
The wallet exposes various functions to interact with the wallet.
```
const walletClient = require('wallet-client');
walletClient.initializeWallet('magmo-wallet-00','my-user-id');
```