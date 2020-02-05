import {eventChannel} from "redux-saga";
import {call, put, take, select} from "redux-saga/effects";
import {Contract} from "ethers";
import {getDepositedEvent, getAssetTransferredEvent} from "@statechannels/nitro-protocol";

import {Web3Provider} from "ethers/providers";

import * as actions from "../actions";
import {getETHAssetHolderContract, getERC20AssetHolderContract} from "../../utils/contract-utils";
import {getAssetHolderWatcherSubscribersForChannel} from "../selectors";
import {ChannelSubscriber} from "../state";
import {ProtocolLocator} from "../../communication";

enum AssetHolderEventType {
  AssetTransferred,
  Deposited
}

interface AssetHolderEvent {
  assetHolderAddress: string;
  eventResult: any[];
  eventType: AssetHolderEventType;
}

export function* assetHoldersWatcher(provider: Web3Provider) {
  const assetHolderEventChannel = yield call(createAssetHolderEventChannel, provider);
  while (true) {
    const event: AssetHolderEvent = yield take(assetHolderEventChannel);
    const {eventType, eventResult} = event;

    let channelId: string;

    if (eventType === AssetHolderEventType.Deposited) {
      channelId = getDepositedEvent(eventResult).destination;
    } else if (eventType === AssetHolderEventType.AssetTransferred) {
      channelId = getAssetTransferredEvent(eventResult).channelId;
    } else {
      continue;
    }

    const channelSubscribers: ChannelSubscriber[] = yield select(
      getAssetHolderWatcherSubscribersForChannel,
      channelId
    );

    for (const {processId, protocolLocator} of channelSubscribers) {
      yield dispatchProcessEventAction(event, processId, protocolLocator);
    }

    yield dispatchEventAction(event);
  }
}

function* dispatchEventAction({eventResult, assetHolderAddress, eventType}: AssetHolderEvent) {
  switch (eventType) {
    case AssetHolderEventType.AssetTransferred:
      yield put(
        actions.assetTransferredEvent({
          assetHolderAddress,
          ...getAssetTransferredEvent(eventResult)
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
  {eventResult, assetHolderAddress, eventType}: AssetHolderEvent,
  processId: string,
  protocolLocator: ProtocolLocator
) {
  switch (eventType) {
    case AssetHolderEventType.AssetTransferred:
      break;
    case AssetHolderEventType.Deposited:
      yield put(
        actions.depositedEvent({
          processId,
          protocolLocator,
          assetHolderAddress,
          ...getDepositedEvent(eventResult)
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

    ETHAssetHolder.on(ethAssetTransferredFilter, (...eventResult) =>
      emitter({
        assetHolderAddress: ETHAssetHolder.address,
        eventType: AssetHolderEventType.AssetTransferred,
        eventResult
      })
    );

    ETHAssetHolder.on(ethDepositedFilter, (...eventResult) =>
      emitter({
        assetHolderAddress: ETHAssetHolder.address,
        eventType: AssetHolderEventType.Deposited,
        eventResult
      })
    );

    ERC20AssetHolder.on(erc20AssetTransferredFilter, (...eventResult) =>
      emitter({
        assetHolderAddress: ERC20AssetHolder.address,
        eventType: AssetHolderEventType.AssetTransferred,
        eventResult
      })
    );

    ERC20AssetHolder.on(erc20DepositedFilter, (...eventResult) =>
      emitter({
        assetHolderAddress: ERC20AssetHolder.address,
        eventType: AssetHolderEventType.Deposited,
        eventResult
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
