import {BigNumber, bigNumberify} from 'ethers/utils';

export interface DepositedEvent {
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}

export interface AssetTransferredEvent {
  destination: string;
  amount: BigNumber;
}

export function getDepositedEvent(eventResult): DepositedEvent {
  const args = eventResult.eventArgs;
  const destination = args[0];
  const amountDeposited = args[1];
  const destinationHoldings = args[2];

  return {
    destination,
    amountDeposited: bigNumberify(amountDeposited),
    destinationHoldings: bigNumberify(destinationHoldings),
  };
}

export function getAssetTransferredEvent(eventResult): AssetTransferredEvent {
  const args = eventResult.eventArgs;
  return {
    destination: args[0],
    amount: bigNumberify(args[1]),
  };
}
