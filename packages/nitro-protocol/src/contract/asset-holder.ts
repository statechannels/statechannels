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

export function getDepositedEvent({eventArgs}): DepositedEvent {
  const [
    {
      args: {destination, amountDeposited, destinationHoldings},
    },
  ] = eventArgs.slice(-1);

  return {
    destination,
    amountDeposited: bigNumberify(amountDeposited),
    destinationHoldings: bigNumberify(destinationHoldings),
  };
}

export function getAssetTransferredEvent({eventArgs}): AssetTransferredEvent {
  const [
    {
      args: {destination, amount},
    },
  ] = eventArgs.slice(-1);

  return {
    destination,
    amount: bigNumberify(amount),
  };
}
