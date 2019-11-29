import {eventChannel} from "redux-saga";
import {call, put, take, select} from "redux-saga/effects";
import {Contract} from "ethers";
import {getDepositedEvent, getAssetTransferredEvent} from "@statechannels/nitro-protocol";

import * as actions from "../actions";
import {getETHAssetHolderContract, getERC20AssetHolderContract} from "../../utils/contract-utils";
import {getAssetHolderWatcherSubscribersForChannel} from "../selectors";
import {ChannelSubscriber} from "../state";
import {ProtocolLocator} from "../../communication";
import {Web3Provider} from "ethers/providers";

enum AssetHolderEventType {
  AssetTransferred,
  Deposited
}

interface AssetHolderEvent {
  assetHolderAddress: string;
  eventArgs: any;
  eventType: AssetHolderEventType;
}

export function* ETHAssetHolderWatcher(provider: Web3Provider) {
  const assetHolderEventChannel = yield call(createAssetHolderEventChannel, provider);
  while (true) {
    const event: AssetHolderEvent = yield take(assetHolderEventChannel);
    if (event.eventType === AssetHolderEventType.Deposited) {
      const channelSubscribers: ChannelSubscriber[] = yield select(
        getAssetHolderWatcherSubscribersForChannel,
        getDepositedEvent(event).destination
      );
      for (const subscriber of channelSubscribers) {
        yield dispatchProcessEventAction(event, subscriber.processId, subscriber.protocolLocator);
      }
    }
    yield dispatchEventAction(event);
  }
}

function* dispatchEventAction(event: AssetHolderEvent) {
  const {eventType} = event;
  switch (eventType) {
    case AssetHolderEventType.AssetTransferred:
      // FIXME: We need some new kind of technique for dealing with AssetTransferred situations
      const assetTransferredEvent = getAssetTransferredEvent(event);
      yield put(
        actions.assetTransferredEvent({
          destination: assetTransferredEvent.destination,
          amount: assetTransferredEvent.amount
        })
      );
      break;
    case AssetHolderEventType.Deposited:
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
  const {eventType, assetHolderAddress} = event;
  switch (eventType) {
    case AssetHolderEventType.AssetTransferred:
      yield put(
        actions.assetTransferredEvent({
          ...getAssetTransferredEvent(event)
        })
      );
      break;
    case AssetHolderEventType.Deposited:
      const {destination, amountDeposited, destinationHoldings} = getDepositedEvent(event);
      yield put(
        actions.depositedEvent({
          processId,
          protocolLocator,
          assetHolderAddress,
          destination,
          amountDeposited,
          destinationHoldings
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

function* createAssetHolderEventChannel(provider: Web3Provider) {
  const ETHAssetHolder: Contract = yield call(getETHAssetHolderContract, provider);
  const ERC20AssetHolder: Contract = yield call(getERC20AssetHolderContract, provider);

  return eventChannel(emitter => {
    const ethAssetTransferredFilter = ETHAssetHolder.filters.AssetTransferred();
    const ethDepositedFilter = ETHAssetHolder.filters.Deposited();
    const erc20AssetTransferredFilter = ERC20AssetHolder.filters.AssetTransferred();
    const erc20DepositedFilter = ERC20AssetHolder.filters.Deposited();

    ETHAssetHolder.on(ethAssetTransferredFilter, (...eventArgs) =>
      emitter({
        assetHolderAddress: ETHAssetHolder.address,
        eventType: AssetHolderEventType.AssetTransferred,
        eventArgs
      })
    );

    ETHAssetHolder.on(ethDepositedFilter, (...eventArgs) =>
      emitter({
        assetHolderAddress: ETHAssetHolder.address,
        eventType: AssetHolderEventType.Deposited,
        eventArgs
      })
    );

    ERC20AssetHolder.on(erc20AssetTransferredFilter, (...eventArgs) =>
      emitter({
        assetHolderAddress: ERC20AssetHolder.address,
        eventType: AssetHolderEventType.AssetTransferred,
        eventArgs
      })
    );

    ERC20AssetHolder.on(erc20DepositedFilter, (...eventArgs) =>
      emitter({
        assetHolderAddress: ERC20AssetHolder.address,
        eventType: AssetHolderEventType.Deposited,
        eventArgs
      })
    );

    return () => {
      // This function is called when the channel gets closed
      ETHAssetHolder.removeAllListeners(ethAssetTransferredFilter);
      ETHAssetHolder.removeAllListeners(ethDepositedFilter);
      ERC20AssetHolder.removeAllListeners(erc20AssetTransferredFilter);
      ERC20AssetHolder.removeAllListeners(erc20DepositedFilter);
    };
  });
}
