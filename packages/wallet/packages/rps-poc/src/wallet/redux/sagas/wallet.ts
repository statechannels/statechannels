import { actionChannel, take, put, fork, } from 'redux-saga/effects';

import { initializeWallet } from './initialization';
import * as actions from '../actions/external';
import ChannelWallet from '../../domain/ChannelWallet';
import { fundingSaga } from './funding';
import { blockchainSaga } from './blockchain';
import { AUTO_OPPONENT_ADDRESS } from '../../../constants';

export function* walletSaga(uid: string): IterableIterator<any> {
  const wallet = yield initializeWallet(uid);
  yield fork(blockchainSaga);

  const channel = yield actionChannel([
    actions.FUNDING_REQUEST,
    actions.SIGNATURE_REQUEST,
    actions.VALIDATION_REQUEST,
  ]);

  yield put(actions.initializationSuccess(wallet.address));

  while(true) {
    const action: actions.RequestAction = yield take(channel)

    // The handlers below will block, so the wallet will only ever
    // process one action at a time from the queue.
    switch (action.type) {
      case actions.SIGNATURE_REQUEST:
        yield handleSignatureRequest(wallet, action.requestId, action.positionData);
        break;

      case actions.VALIDATION_REQUEST:
        yield handleValidationRequest(action.requestId, action.signedPositionData);
        break;

      case actions.FUNDING_REQUEST:
        yield handleFundingRequest(wallet, action.channelId, action.state);
        break;

      default:
        // const _exhaustiveCheck: never = action;
        // todo: get this to work
        // currently causes a 'noUnusedLocals' error on compilation
        // underscored variables should be an exception but there seems to 
        // be a bug in my current version of typescript
        // https://github.com/Microsoft/TypeScript/issues/15053
    }
  }
}

function* handleSignatureRequest(wallet: ChannelWallet, requestId, positionData) {
  // todo:
  // - validate the transition
  // - sign the position
  // - store the position
  const signedPosition = wallet.sign(positionData)

  yield put(actions.signatureSuccess(requestId, signedPosition));
}

function* handleValidationRequest(requestId, data) {
  // todo:
  // - check the signature
  // - validate the transition
  // - store the position

  yield put(actions.validationSuccess(requestId, data));
}

function* handleFundingRequest(_wallet: ChannelWallet, channelId, state) {
  let success;
  if (state.opponentAddress === AUTO_OPPONENT_ADDRESS) {
    success = true
  } else {
    success = yield fundingSaga(channelId, state);
  }

  if (success) {
    yield put(actions.fundingSuccess(channelId));
  } else {
    yield put(actions.fundingFailure(channelId, 'Something went wrong'));
  }
  return true;
}
