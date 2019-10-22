const wallet = window.EmbeddedWallet;

export const connectToWallet = () => {
  try {
    wallet.enable(process.env.REACT_APP_EMBEDDED_WALLET_URL);
  } catch (error) {
    console.log('Error while connecting to wallet', error.name);
  }
};

export async function makeWalletRequest() {
  try {
    return wallet.request({
      jsonrpc: '2.0',
      method: 'chan_allocate',
      id: 123,
      params: ['foo', 'bar', 3, false]
    });
  } catch (error) {
    console.log('Error while making request to wallet', error.name);
    return Promise.reject();
  }
}

export async function askForFunds() {
  connectToWallet();
  return makeWalletRequest();
}
