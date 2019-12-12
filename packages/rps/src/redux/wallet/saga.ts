import {call, put} from 'redux-saga/effects';
import * as walletActions from './actions';
import {WalletErrorType} from './actions';

export default function* checkWallet() {
  if (typeof window.channelProvider !== 'object' || window.channelProvider === null) {
    yield put(
      walletActions.walletErrorOccurred({
        errorType: WalletErrorType.NoChannelProvider,
      })
    );
    return false;
  }

  try {
    if (window.channelProvider) {
      try {
        yield call([window.channelProvider, 'enable'], process.env.WALLET_URL);
        yield put(walletActions.walletSuccess());
        return true;
      } catch (e) {
        console.error(e);
        yield put(
          walletActions.walletErrorOccurred({
            errorType: WalletErrorType.EnablingError,
          })
        );
      }
    }
  } catch (e) {
    console.error(e);
    yield put(
      walletActions.walletErrorOccurred({
        errorType: WalletErrorType.UnknownError,
      })
    );
  }

  return false;
}
