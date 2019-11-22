import { ChannelState, Outcome, Recipient, SignedState } from '.';

const NULL_OUTCOME: Outcome = [];

export class Store {
  private store: { [channelID: string]: SignedState };

  constructor() {
    this.store = {
      '0xabc': {
        state: {
          turnNumber: 0,
          outcome: NULL_OUTCOME,
          appData: '0x',
          participants: [],
        },
      },
    };
  }

  public get(channelID: string): SignedState {
    return this.store[channelID];
  }

  public sign(channelID: string, state: ChannelState, recipient?: Recipient) {
    this.store[channelID] = signState(this.store[channelID] || { state });
    if (recipient) {
      // send to recipient
    }
  }
}

function signState({ state, signatures }: SignedState): SignedState {
  return {
    state,
    signatures: (signatures || []).concat('Signature'),
  };
}

// The store would send this action whenever the channel is updated
export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  channelID: string;
}

export interface Deposit {
  type: 'DEPOSIT';
  channelID: string;
  currentAmount: number;
}

export type StoreEvent = ChannelUpdated | Deposit;
