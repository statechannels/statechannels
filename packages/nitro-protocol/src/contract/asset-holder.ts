import {BigNumber, bigNumberify} from 'ethers/utils';

export interface DepositedEvent {
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}
export function getDepositedEvent(eventResult): DepositedEvent {
  const [event] = eventResult.slice(-1);
  const {destination, amountDeposited, destinationHoldings} = event.args;

  return {
    destination,
    amountDeposited: bigNumberify(amountDeposited),
    destinationHoldings: bigNumberify(destinationHoldings),
  };
}
