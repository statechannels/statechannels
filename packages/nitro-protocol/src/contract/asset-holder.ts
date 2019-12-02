import {BigNumber, bigNumberify} from 'ethers/utils';
import {parseEventResult} from '../ethers-utils';

export interface DepositedEvent {
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}

export interface AssetTransferredEvent {
  channelId: string;
  destination: string;
  amount: BigNumber;
}

export function getDepositedEvent(eventResult: any[]): DepositedEvent {
  const {destination, amountDeposited, destinationHoldings} = parseEventResult(eventResult);
  return {
    destination,
    amountDeposited: bigNumberify(amountDeposited),
    destinationHoldings: bigNumberify(destinationHoldings),
  };
}

export function getAssetTransferredEvent(eventResult: any[]): AssetTransferredEvent {
  const {channelId, destination, amount} = parseEventResult(eventResult);
  return {
    channelId,
    destination,
    amount: bigNumberify(amount),
  };
}
