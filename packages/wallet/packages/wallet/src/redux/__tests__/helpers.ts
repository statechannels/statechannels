import { ChannelState } from '../channelState/state';
import { OutboxState } from '../outbox/state';
import { StateWithSideEffects } from '../shared/state';
import { Commitment } from 'fmg-core';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';

export const itSendsAMessage = (state: StateWithSideEffects<ChannelState>) => {
  it(`sends a message`, () => {
    expect(state.outboxState!.messageOutbox).toEqual(expect.anything());
  });
};

export const itSendsNoMessage = (state: StateWithSideEffects<ChannelState>) => {
  it(`sends no message`, () => {
    if (state.outboxState) {
      expect(state.outboxState!.messageOutbox).toBeUndefined();
    }
  });
};

export const itSendsThisMessage = (state: { outboxState?: OutboxState }, message) => {
  if (message.type) {
    // We've received the entire action
    it(`sends a message `, () => {
      expect(state.outboxState!.messageOutbox!).toMatchObject(message);
    });
  } else {
    // Assume we've only received the type of the message
    it(`sends message ${message}`, () => {
      expect(state.outboxState!.messageOutbox!.type).toEqual(message);
    });
  }
};

export const itSendsThisDisplayEvent = (state: StateWithSideEffects<ChannelState>, event) => {
  it(`sends event ${event.type}`, () => {
    expect(state.outboxState!.displayOutbox!.type).toEqual(event);
  });
};

type CommitmentMessage = outgoing.FundingSuccess;

export const expectThisCommitmentSent = (
  state: StateWithSideEffects<ChannelState>,
  c: Partial<Commitment>,
) => {
  expect((state.outboxState!.messageOutbox! as CommitmentMessage).commitment).toMatchObject(c);
};

export const itSendsATransaction = (state: StateWithSideEffects<ChannelState>) => {
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

export const itTransitionsToChannelStateType = (
  type,
  state: StateWithSideEffects<ChannelState>,
) => {
  it(`transitions to ${type}`, () => {
    expect(state.state.type).toEqual(type);
  });
};

export const itTransitionsToStateType = (
  type,
  stateWithSideEffects: StateWithSideEffects<{ type: any }>,
) => {
  it(`transitions to ${type}`, () => {
    expect(stateWithSideEffects.state.type).toEqual(type);
  });
};

export const itDoesntTransition = (
  oldState: ChannelState,
  newState: StateWithSideEffects<ChannelState>,
) => {
  it(`doesn't transition`, () => {
    expect(newState.state.type).toEqual(oldState.type);
  });
};

export const itIncreasesTurnNumBy = (
  increase: number,
  oldState: ChannelState,
  newState: StateWithSideEffects<ChannelState>,
) => {
  it(`increases the turnNum by ${increase}`, () => {
    if (!('turnNum' in newState.state) || !('turnNum' in oldState)) {
      fail('turnNum does not exist on one of the states');
    } else {
      expect(newState.state.turnNum).toEqual(oldState.turnNum + increase);
    }
  });
};

export const itDispatchesThisAction = (action, state: { outboxState?: OutboxState }) => {
  if (action.type) {
    it(`dispatches ${action.type}`, () => {
      // The actionOutbox should only dispatch internal actions
      // We were passed the whole action
      expect(action.type).toMatch('WALLET.INTERNAL');
      expect(state.outboxState!.actionOutbox).toMatchObject(action);
    });
  } else {
    it(`dispatches ${action}`, () => {
      // We were just passed the type
      expect(action).toMatch('WALLET.INTERNAL');
      expect(state.outboxState!.actionOutbox!.type).toEqual(action);
    });
  }
};

export const itDispatchesNoAction = (state: { outboxState?: OutboxState }) => {
  it(`dispatches no action`, () => {
    if (state.outboxState) {
      expect(state.outboxState!.actionOutbox).toBeUndefined();
    }
  });
};

export function itChangesDepositStatusTo(status: string, state) {
  it(`changes depositStatus to ${status} `, () => {
    expect(state.state.depositStatus).toEqual(status);
  });
}
export function itChangesChannelFundingStatusTo<T extends { state: { channelFundingStatus: any } }>(
  status: string,
  state: T,
) {
  it(`changes channelFundingStatus to ${status}`, () => {
    expect(state.state.channelFundingStatus).toEqual(status);
  });
}
