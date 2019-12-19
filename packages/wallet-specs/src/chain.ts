interface Chain {
  holdings: (channelId: string) => number;
  deposit: (
    channelId: string,
    expectedHeld: number,
    amount: number
  ) => Deposited | Revert;
}

export const chain = (null as any) as Chain;

class ExampleChain {
  private _holdings: { [channelId: string]: number };

  constructor() {
    this._holdings = {
      '0xabc': 1,
      '0x123': 2,
    };
  }

  public holdings(channelId) {
    return this._holdings[channelId];
  }

  public deposit(
    channelId: string,
    expectedHeld: number,
    amount: number
  ): Deposited | Revert {
    const current = this._holdings[channelId] || 0;
    if (current >= expectedHeld) {
      this._holdings[channelId] = (this._holdings[channelId] || 0) + amount;
      return {
        type: 'DEPOSITED',
        channelId,
        amount,
        total: this._holdings[channelId],
      };
    } else {
      return 'REVERT';
    }
  }
}

// The store would send this action whenever the channel is updated
export interface Deposited {
  type: 'DEPOSITED';
  channelId: string;
  amount: number;
  total: number;
}

export type Revert = 'REVERT';

export type ChainEvent = Deposited | Revert;
