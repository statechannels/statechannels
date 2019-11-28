import {eventChannel} from "redux-saga";
import {call, put, select, take} from "redux-saga/effects";
import {Contract} from "ethers";
import {getAssetTransferredEvent, getDepositedEvent} from "@statechannels/nitro-protocol";

import * as actions from "../actions";
import {getETHAssetHolderContract, getETHAssetHolderAddress} from "../../utils/contract-utils";
import {ChannelSubscriber} from "../state";
import {getETHAssetHolderWatcherSubscribersForChannel} from "../selectors";
import {ProtocolLocator} from "../../communication";

enum AssetHolderEventType {
  AssetTransferred,
  Deposited
}

interface AssetHolderEvent {
  eventArgs: any;
  channelId: string;
  eventType: AssetHolderEventType;
}

export function* ETHAssetHolderWatcher(provider) {
  const ETHAssetHolderEventChannel = yield call(createAssetHolderEventChannel, provider);
  while (true) {
    const event: AssetHolderEvent = yield take(ETHAssetHolderEventChannel);

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

function* dispatchEventAction(event: AssetHolderEvent) {
  switch (event.eventType) {
    case AssetHolderEventType.AssetTransferred:
      const assetTransferredEvent = getAssetTransferredEvent(event);
      yield put(
        actions.assetTransferredEvent({
          destination: assetTransferredEvent.destination,
          amount: assetTransferredEvent.amount
        })
      );
      break;
    case AssetHolderEventType.Deposited:
      const depositedEvent = getDepositedEvent(event);
      yield put(
        actions.depositedEvent({
          assetHolderAddress: getETHAssetHolderAddress(),
          destination: depositedEvent.destination,
          amountDeposited: depositedEvent.amountDeposited,
          destinationHoldings: depositedEvent.destinationHoldings
        })
      );
      break;
    default:
      throw new Error(
        `Event is not a known AssetHolderEvent. Cannot dispatch event action: ${JSON.stringify(
          event
        )}`
      );
  }
}

function* dispatchProcessEventAction(
  event: AssetHolderEvent,
  processId: string,
  protocolLocator: ProtocolLocator
) {
  switch (event.eventType) {
    case AssetHolderEventType.AssetTransferred:
      const assetTransferredEvent = getAssetTransferredEvent(event);
      yield put(
        actions.assetTransferredEvent({
          destination: assetTransferredEvent.destination,
          amount: assetTransferredEvent.amount
        })
      );
      break;
    case AssetHolderEventType.Deposited:
      const depositedEvent = getDepositedEvent(event);
      yield put(
        actions.depositedEvent({
          assetHolderAddress: getETHAssetHolderAddress(),
          destination: depositedEvent.destination,
          amountDeposited: depositedEvent.amountDeposited,
          destinationHoldings: depositedEvent.destinationHoldings
        })
      );
      break;
    default:
      throw new Error(
        `Event is not a known AssetHolderEvent. Cannot dispatch process event action: ${JSON.stringify(
          event
        )}`
      );
  }
}

function* createAssetHolderEventChannel(provider) {
  const ETHAssetHolder: Contract = yield call(getETHAssetHolderContract, provider);

  return eventChannel(emitter => {
    const assetTransferredFilter = ETHAssetHolder.filters.AssetTransferred();
    const depositedFilter = ETHAssetHolder.filters.Deposited();

    ETHAssetHolder.on(assetTransferredFilter, (...eventArgs) =>
      emitter({
        eventType: AssetHolderEventType.AssetTransferred,
        eventArgs
      })
    );

    ETHAssetHolder.on(depositedFilter, (...eventArgs) =>
      emitter({eventType: AssetHolderEventType.Deposited, eventArgs})
    );

    return () => {
      // This function is called when the channel gets closed
      ETHAssetHolder.removeAllListeners(assetTransferredFilter);
      ETHAssetHolder.removeAllListeners(depositedFilter);
    };
  });
}
