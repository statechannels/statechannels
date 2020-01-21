import { add } from '.';
export type ChainEventListener = (event: ChainEvent) => void;
export type ChainEventType = ChainEvent['type'];
export interface IChain {
  initialize(): Promise<void>;
  getHoldings: (channelId: string) => Promise<string>;
  deposit: (channelId: string, expectedHeld: string, amount: string) => Promise<Deposited | Revert>;
  on: (chainEventType: ChainEventType, listener: ChainEventListener) => () => void;
}

export class Chain implements IChain {
  public async initialize(): Promise<void> {
    // Do nothing
  }
  protected _holdings: { [channelId: string]: string };

  constructor(holdings?) {
    this._holdings = holdings || {};
  }

  public async getHoldings(channelId) {
    return this._holdings[channelId] || '0';
  }

  public on(chainEventType: ChainEvent['type'], listener: ChainEventListener) {
    if (chainEventType !== 'DEPOSITED') {
      throw new Error(`No support for ${chainEventType} events yet.`);
    }

    return () => {};
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
      return { type: 'REVERT' };
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

export interface Revert {
  type: 'REVERT';
}

export type ChainEvent = Deposited | Revert;
