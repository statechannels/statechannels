import {BigNumber, bigNumberify} from 'ethers/utils';

export interface DepositedEvent {
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
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
