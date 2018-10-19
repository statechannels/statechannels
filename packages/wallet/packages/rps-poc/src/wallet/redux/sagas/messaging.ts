import { MESSAGE_RECEIVED, MESSAGE_SENT } from "../actions/external";
import { actionChannel, take, call } from "redux-saga/effects";
import ChannelWallet from "src/wallet/domain/ChannelWallet";
import { reduxSagaFirebase, serverTimestamp } from "src/gateways/firebase";
import decode from "src/wallet/domain/decode";

export function* messageListenerSaga(wallet:ChannelWallet){
    const channel = yield actionChannel([MESSAGE_RECEIVED, MESSAGE_SENT]);
    while(true){
        const action = yield take(channel);
        const {positionData, signature} = action;
        const direction = action.type === MESSAGE_RECEIVED ? "received": "sent";
    
        const channelId = decode(positionData).channel.id;
        yield call(
          reduxSagaFirebase.database.update,
          `wallets/${wallet.id}/channels/${channelId}/${direction}`,
          { state: positionData, signature, updatedAt: serverTimestamp }
        );
    }
}