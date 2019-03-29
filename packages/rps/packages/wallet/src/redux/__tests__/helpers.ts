import { ChannelStatus } from '../channelState/state';
import { StateWithSideEffects } from '../utils';
import { Commitment } from 'fmg-core';
import { TransactionOutboxItem } from '../outbox/state';

export const itSendsAMessage = (state: StateWithSideEffects<ChannelStatus>) => {
  it(`sends a message`, () => {
    expect(state.sideEffects!.messageOutbox).toEqual(expect.anything());
  });
};

export const itSendsNoMessage = (state: StateWithSideEffects<ChannelStatus>) => {
  it(`sends no message`, () => {
    if (state.sideEffects) {
      expect(state.sideEffects!.messageOutbox).toBeUndefined();
    }
  });
};

export const itSendsThisMessage = (state: StateWithSideEffects<any>, message, idx = 0) => {
  if (Array.isArray(message)) {
    message.map((m, i) => itSendsThisMessage(state, m, i));
    return;
  }

  if (message.type) {
    // We've received the entire action
    it(`sends a message`, () => {
      expectSideEffect('messageOutbox', state, message, idx);
    });
  } else {
    // Assume we've only received the type of the message
    it(`sends message ${message}`, () => {
      expectSideEffect('messageOutbox', state, message, idx);
    });
  }
};

export const itSendsThisDisplayEventType = (
  state: StateWithSideEffects<ChannelStatus>,
  eventType: string,
) => {
  it(`sends event ${eventType}`, () => {
    expectSideEffect('displayOutbox', state, eventType);
  });
};

const expectSideEffect = <StateType>(
  outboxBranch: string,
  state: StateWithSideEffects<StateType>,
  actionOrObject: object | string | undefined,
  idx = 0,
) => {
  const outbox = state.sideEffects![outboxBranch];
  const item = Array.isArray(outbox) ? outbox[idx] : outbox;
  if (typeof actionOrObject === 'string') {
    expect(item.type).toEqual(actionOrObject);
  } else if (typeof actionOrObject === 'undefined') {
    expect(item).toBeUndefined();
  } else {
    expect(item).toMatchObject(actionOrObject);
  }
};

export const expectThisCommitmentSent = (
  state: StateWithSideEffects<ChannelStatus>,
  c: Partial<Commitment>,
) => {
  expect(state.sideEffects!.messageOutbox![0].commitment).toMatchObject(c);
  const outbox = state.sideEffects!.messageOutbox;
  const item = Array.isArray(outbox) ? outbox[0] : outbox;
  expect((item as { commitment: any }).commitment).toMatchObject(c);
};

export const itSendsATransaction = (state: StateWithSideEffects<ChannelStatus>) => {
  it(`sends a transaction`, () => {
    expectSideEffect('transactionOutbox', state, expect.anything());
  });
};

export const itSendsThisTransaction = (
  state: StateWithSideEffects<any>,
  tx: TransactionOutboxItem,
) => {
  it(`sends a transaction`, () => {
    const { transactionRequest } = tx;
    expectSideEffect('transactionOutbox', state, {
      transactionRequest,
      channelId: expect.any(String),
    });
  });
};

export const itSendsNoTransaction = (state: StateWithSideEffects<any>) => {
  it(`doesn't send a transaction`, () => {
    if (state.sideEffects) {
      expectSideEffect('transactionOutbox', state, undefined);
      expect(state.sideEffects.transactionOutbox).toBeUndefined();
    }
  });
};

export const itTransitionsToChannelStateType = (
  type,
  state: StateWithSideEffects<ChannelStatus>,
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
  oldState: ChannelStatus,
  newState: StateWithSideEffects<ChannelStatus>,
) => {
  it(`doesn't transition`, () => {
    expect(newState.state.type).toEqual(oldState.type);
  });
};

export const itIncreasesTurnNumBy = (
  increase: number,
  oldState: ChannelStatus,
  newState: StateWithSideEffects<ChannelStatus>,
) => {
  it(`increases the turnNum by ${increase}`, () => {
    if (!('turnNum' in newState.state) || !('turnNum' in oldState)) {
      fail('turnNum does not exist on one of the states');
    } else {
      expect(newState.state.turnNum).toEqual(oldState.turnNum + increase);
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
