import {eventChannel} from "redux-saga";
import {call, put, select, take} from "redux-saga/effects";
import {ethers} from "ethers";
import {getDepositedEvent} from "@statechannels/nitro-protocol";

import * as actions from "../actions";
import {getETHAssetHolderContract} from "../../utils/contract-utils";
import {ChannelSubscriber} from "../state";
import {getETHAssetHolderWatcherSubscribersForChannel} from "../selectors";
import {ProtocolLocator} from "src/communication";

enum ETHAssetHolderEventType {
  AssetTransferred,
  Deposited
}

interface ETHAssetHolderEvent {
  eventArgs: any;
  channelId: string;
  eventType: ETHAssetHolderEventType;
}

export function* ETHAssetHolderWatcher(provider) {
  const ETHAssetHolderEventChannel = yield call(createAssetHolderEventChannel, provider);
  while (true) {
    const event: ETHAssetHolderEvent = yield take(ETHAssetHolderEventChannel);

    const channelSubscribers: ChannelSubscriber[] = yield select(
      getETHAssetHolderWatcherSubscribersForChannel,
      event.channelId
    );

    yield dispatchEventAction(event);
    for (const subscriber of channelSubscribers) {
      yield dispatchProcessEventAction(event, subscriber.processId, subscriber.protocolLocator);
    }
  }
}

function* dispatchEventAction(event: ETHAssetHolderEvent) {
  switch (event.eventType) {
    case ETHAssetHolderEventType.AssetTransferred:
      // TODO:
      break;
    case ETHAssetHolderEventType.Deposited:
      const depositedEvent = getDepositedEvent(event);
      yield put(
        actions.depositedEvent({
          destination: depositedEvent.destination,
          amountDeposited: depositedEvent.amountDeposited,
          destinationHoldings: depositedEvent.destinationHoldings
        })
      );
      break;
    default:
      throw new Error(
        `Event is not a known ETHAssetHolderEvent. Cannot dispatch event action: ${JSON.stringify(event)}`
      );
  }
}

function* dispatchProcessEventAction(event: ETHAssetHolderEvent, processId: string, protocolLocator: ProtocolLocator) {
  switch (event.eventType) {
    case ETHAssetHolderEventType.AssetTransferred:
      // TODO:
      break;
    case ETHAssetHolderEventType.Deposited:
      const depositedEvent = getDepositedEvent(event);
      yield put(
        actions.depositedEvent({
          destination: depositedEvent.destination,
          amountDeposited: depositedEvent.amountDeposited,
          destinationHoldings: depositedEvent.destinationHoldings
        })
      );
      break;
    default:
      throw new Error(
        `Event is not a known ETHAssetHolderEvent. Cannot dispatch process event action: ${JSON.stringify(event)}`
      );
  }
}

function* createAssetHolderEventChannel(provider) {
  const ETHAssetHolder: ethers.Contract = yield call(getETHAssetHolderContract, provider);

  return eventChannel(emitter => {
    const assetTransferredFilter = ETHAssetHolder.filters.AssetTransferred();
    const depositedFilter = ETHAssetHolder.filters.Deposited();

    ETHAssetHolder.on(assetTransferredFilter, (...eventArgs) => {
      emitter({
        eventType: ETHAssetHolderEventType.AssetTransferred,
        eventArgs
      });
    });
    ETHAssetHolder.on(depositedFilter, (...eventArgs) => {
      emitter({eventType: ETHAssetHolderEventType.Deposited, eventArgs});
    });

    return () => {
      // This function is called when the channel gets closed
      ETHAssetHolder.removeAllListeners(assetTransferredFilter);
      ETHAssetHolder.removeAllListeners(depositedFilter);
    };
  });
}
