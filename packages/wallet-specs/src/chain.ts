interface Chain {
  holdings: (channelId: string) => number;
  deposit: (channelId: string, expectedHeld: number, amount: number) => Deposited | Revert;
}

export const chain = (null as any) as Chain;

// The store would send this action whenever the channel is updated
export interface Deposited {
  type: 'DEPOSITED';
  channelId: string;
  amount: number;
  total: number;
}

export type Revert = 'REVERT';

export type ChainEvent = Deposited | Revert;
