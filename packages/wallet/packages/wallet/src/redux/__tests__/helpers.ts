import { ChannelState } from '../channelState/state';
import { OutboxState } from '../outbox/state';
import { NextChannelState } from '../shared/state';
import { Commitment } from 'fmg-core';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';

export const itSendsAMessage = (state: NextChannelState<ChannelState>) => {
  it(`sends a message`, () => {
    expect(state.outboxState!.messageOutbox).toEqual(expect.anything());
  });
};

export const itSendsThisMessage = (
  state: { outboxState?: OutboxState },
  message,
  typeOnly = true,
) => {
  if (typeOnly) {
    it(`sends message ${message}`, () => {
      expect(state.outboxState!.messageOutbox!.type).toEqual(message);
    });
  } else {
    it(`sends a message `, () => {
      expect(state.outboxState!.messageOutbox!).toMatchObject(message);
    });
  }
};

export const itSendsThisDisplayEvent = (state: NextChannelState<ChannelState>, event) => {
  it(`sends event ${event.type}`, () => {
    expect(state.outboxState!.displayOutbox!.type).toEqual(event);
  });
};

type CommitmentMessage = outgoing.FundingSuccess;

export const expectThisCommitmentSent = (
  state: NextChannelState<ChannelState>,
  c: Partial<Commitment>,
) => {
  expect((state.outboxState!.messageOutbox! as CommitmentMessage).commitment).toMatchObject(c);
};

export const itSendsATransaction = (state: NextChannelState<ChannelState>) => {
  it(`sends a transaction`, () => {
    expect(state.outboxState!.transactionOutbox).toEqual(expect.anything());
  });
};

export const itSendsThisTransaction = (state: { outboxState?: OutboxState }, tx) => {
  it(`sends a transaction`, () => {
    expect(state.outboxState!.transactionOutbox).toEqual(tx);
  });
};

export const itSendsNoTransaction = (state: { outboxState?: OutboxState }) => {
  it(`doesn't send a transaction`, () => {
    if (state.outboxState) {
      expect(state.outboxState.transactionOutbox).toBeUndefined();
    }
  });
};

export const itTransitionsToChannelStateType = (type, state: NextChannelState<ChannelState>) => {
  it(`transitions to ${type}`, () => {
    expect(state.channelState.type).toEqual(type);
  });
};

export const itTransitionsToStateType = (type, state: { type: any }) => {
  it(`transitions to ${type}`, () => {
    expect(state.type).toEqual(type);
  });
};

export const itDoesntTransition = (
  oldState: ChannelState,
  newState: NextChannelState<ChannelState>,
) => {
  it(`doesn't transition`, () => {
    expect(newState.channelState.type).toEqual(oldState.type);
  });
};

export const itIncreasesTurnNumBy = (
  increase: number,
  oldState: ChannelState,
  newState: NextChannelState<ChannelState>,
) => {
  it(`increases the turnNum by ${increase}`, () => {
    if (!('turnNum' in newState.channelState) || !('turnNum' in oldState)) {
      fail('turnNum does not exist on one of the states');
    } else {
      expect(newState.channelState.turnNum).toEqual(oldState.turnNum + increase);
    }
  });
};
