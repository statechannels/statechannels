import { ChannelState, Outcome, Recipient, SignedState } from '.';

export class Chain {
  private _holdings: { [channelID: string]: number };

  constructor() {
    this._holdings = {
      '0xabc': 1,
      '0x123': 2,
    };
  }

  public holdings(channelID) {
    return this._holdings[channelID];
  }

  public deposit(channelID: string, expectedHeld: number, amount: number): Deposited | Revert {
    const current = this._holdings[channelID] || 0;
    if (current >= expectedHeld) {
      this._holdings[channelID] = (this._holdings[channelID] || 0) + amount;
      return {
        type: 'DEPOSITED',
        channelID,
        amount,
        total: this._holdings[channelID],
      };
    } else {
      return 'REVERT';
    }
  }
}

// The store would send this action whenever the channel is updated
export interface Deposited {
  type: 'DEPOSITED';
  channelID: string;
  amount: number;
  total: number;
}

export type Revert = 'REVERT';

export type ChainEvent = Deposited | Revert;
