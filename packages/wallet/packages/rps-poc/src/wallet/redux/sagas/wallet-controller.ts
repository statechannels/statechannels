import { WalletEngine, setupWalletEngine } from '../../wallet-engine/WalletEngine';
import {
  Wallet,
  WalletFundingActionType,
  WalletFundingAction,
  WalletFundingRequestAction,
} from '../..';
import { take, put, actionChannel } from 'redux-saga/effects';
import {
  BlockchainAction,
  BlockchainActionType,
  BlockchainReceiveEventAction,
} from '../actions/blockchain';
import { State } from '../../wallet-engine/wallet-states';
import { WalletStateActions } from '../actions/wallet-state';
// The State contract is just currently loaded to force the truffle migrations
// and demonstrate how we can load a contract from the app
// Once we have the ajudicator loading properly this can go.
import contract from 'truffle-contract';
// tslint:disable-next-line:comment-format
//@ts-ignore
import stateContractArtifact from 'fmg-core/contracts/State.sol';
export default function* walletControllerSaga() {
  let walletEngine: WalletEngine | null = null;
  let wallet: Wallet | null = null;
  let walletState: State | null = null;

  const action: WalletFundingRequestAction = yield take(
    WalletFundingActionType.WALLETFUNDING_REQUEST,
  );

  // TODO: We'll need some logic to figure out the current state of funding by talking to the blockchain

  if (walletEngine == null) {
    wallet = action.wallet;
    walletEngine = setupWalletEngine(action.wallet, action.playerIndex, 'Dummy transaction');

    // Before waiting for any events check if we need to send something
    if (walletEngine != null && walletEngine.state != null && walletEngine.state.isReadyToSend) {
      put(BlockchainAction.sendTransaction(walletEngine.state.transaction, wallet));
      contract(stateContractArtifact);
      walletState = walletEngine.transactionSent();
      yield put(WalletStateActions.stateChanged(walletState));
    }

    const channel = yield actionChannel(BlockchainActionType.BLOCKCHAIN_RECEIVEEVENT);
    while (walletState != null && !walletState.isFunded) {
      // We'll wait for any events from the blockchain
      const receiveAction: BlockchainReceiveEventAction = yield take(channel);
      walletState = walletEngine.receiveEvent(receiveAction.event);
      yield put(WalletStateActions.stateChanged(walletState));
      // If our new state has something to send to the blockchain, send it
      if (walletState != null && walletState.isReadyToSend) {
        put(BlockchainAction.sendTransaction(walletState.transaction, wallet));
        walletState = walletEngine.transactionSent();
        yield put(WalletStateActions.stateChanged(walletState));
      }
    }

    if (walletState != null && walletState.isFunded) {
      yield put(WalletFundingAction.walletFunded(walletState.adjudicator));
    }
  }
}
