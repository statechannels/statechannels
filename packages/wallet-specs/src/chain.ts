import { add } from '.';
export type ChainEventListener = (event: ChainEvent) => void;
export type ChainEventType = ChainEvent['type'];
export interface IChain {
  initialize(): Promise<void>;
  getHoldings: (channelId: string) => Promise<string>;
  deposit: (channelId: string, expectedHeld: string, amount: string) => Promise<void>;
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

  public async deposit(channelId: string, expectedHeld: string, amount: string): Promise<void> {
    const current = this._holdings[channelId] || 0;
    if (current >= expectedHeld) {
      this._holdings[channelId] = add(this._holdings[channelId] || 0, amount);
      this.triggerEvent({
        type: 'DEPOSITED',
        channelId,
        amount,
        total: this._holdings[channelId],
      });
    } else {
      this.triggerEvent({ type: 'REVERT' });
    }
  }

  public triggerEvent(chainEvent: ChainEvent) {
    if (this._listeners) {
      this._listeners.map(listener => listener(chainEvent));
    }
  }
  private _listeners: ChainEventListener[] = [];

  public on(_, listener) {
    this._listeners.push(listener);
    const idx = this._listeners.length - 1;

    return () => this._listeners.splice(idx, 1);
  }

  public setHoldings(channelId, amount) {
    this._holdings[channelId] = amount;
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
