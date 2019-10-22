import {JsonRPCRequest} from 'web3/providers';

export const connectToWallet = () => {
  const wallet = window.EmbeddedWallet;

  try {
    wallet.enable(process.env.REACT_APP_EMBEDDED_WALLET_URL);
  } catch (error) {
    console.log('Error while connecting to wallet');
    console.log(error.stack);
  }
};

export async function makeWalletRequest(
  request: JsonRPCRequest = {
    jsonrpc: '2.0',
    method: 'chan_allocate',
    id: 123,
    params: ['foo', 'bar', 3, false]
  }
) {
  const wallet = window.EmbeddedWallet;

  try {
    return wallet.request(request);
  } catch (error) {
    console.log('Error while making request to wallet');
    console.log(error.stack);
    return Promise.reject(error);
  }
}

export async function askForFunds() {
  connectToWallet();
  return makeWalletRequest();
}
