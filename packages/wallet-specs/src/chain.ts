import { add } from '.';

export interface IChain {
  getHoldings: (channelId: string) => Promise<string>;
  deposit: (channelId: string, expectedHeld: string, amount: string) => Promise<Deposited | Revert>;
}

export class Chain implements IChain {
  private _holdings: { [channelId: string]: string };

  constructor(holdings?) {
    this._holdings = holdings || {};
  }

  public async getHoldings(channelId) {
    return this._holdings[channelId] || '0';
  }

  public async deposit(
    channelId: string,
    expectedHeld: string,
    amount: string
  ): Promise<ChainEvent> {
    const current = this._holdings[channelId] || 0;
    if (current >= expectedHeld) {
      this._holdings[channelId] = add(this._holdings[channelId] || 0, amount);
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
  amount: string;
  total: string;
}

export type Revert = 'REVERT';

export type ChainEvent = Deposited | Revert;
