import { ChannelState, ChannelStore } from '../channel-store';
import { StateWithSideEffects } from '../utils';
import { Commitment, SignedCommitment, getChannelId } from '../../domain';
import { QueuedTransaction, OutboxState } from '../outbox/state';
import { SharedData } from '../state';
import { ProtocolStateWithSharedData } from '../protocols';
import { COMMITMENT_RECEIVED } from '../actions';

type SideEffectState =
  | StateWithSideEffects<any>
  | { outboxState: OutboxState }
  | { sharedData: SharedData };
export const itSendsAMessage = (state: SideEffectState) => {
  it(`sends a message`, () => {
    expectSideEffect('messageOutbox', state, item => expect(item).toEqual(expect.anything()));
  });
};

export const itSendsNoMessage = (state: SideEffectState) => {
  it(`sends no message`, () => {
    expectSideEffect('messageOutbox', state, item => expect(item).toBeUndefined());
  });
};

export const itSendsThisMessage = (state: SideEffectState, message, idx = 0) => {
  if (Array.isArray(message)) {
    message.map((m, i) => itSendsThisMessage(state, m, i));
    return;
  }

  if (message.type) {
    // We've received the entire action
    it(`sends a message`, () => {
      expectSideEffect('messageOutbox', state, item => expect(item).toMatchObject(message), idx);
    });
  } else {
    // Assume we've only received the type of the message
    it(`sends message ${message}`, () => {
      expectSideEffect('messageOutbox', state, item => expect(item.type).toEqual(message), idx);
    });
  }
};

export const itSendsThisDisplayEventType = (state: SideEffectState, eventType: string) => {
  it(`sends event ${eventType}`, () => {
    expectSideEffect('displayOutbox', state, item => expect(item.type).toEqual(eventType));
  });
};

const expectSideEffect = (
  outboxBranch: string,
  state: SideEffectState,
  expectation: (item) => any,
  // actionOrObject: object | string | undefined,
  idx = 0,
) => {
  let outbox;
  if ('sideEffects' in state && state.sideEffects) {
    outbox = state.sideEffects[outboxBranch];
  } else if ('outboxState' in state) {
    outbox = state.outboxState[outboxBranch];
  } else if ('sharedData' in state) {
    outbox = state.sharedData.outboxState[outboxBranch];
  }
  const item = Array.isArray(outbox) ? outbox[idx] : outbox;
  expectation(item);
};

export const expectThisCommitmentSent = (state: SideEffectState, c: Partial<Commitment>) => {
  expectSideEffect('messageOutbox', state, item => {
    expect(item.messagePayload.data.type).toEqual(COMMITMENT_RECEIVED);
    expect(item.messagePayload.data.signedCommitment.commitment).toMatchObject(c);
  });
};

export const itSendsATransaction = (state: SideEffectState) => {
  it(`sends a transaction`, () => {
    expectSideEffect('transactionOutbox', state, item => expect(item).toBeDefined());
  });
};

export const itSendsThisTransaction = (state: SideEffectState, tx: QueuedTransaction) => {
  it(`sends a transaction`, () => {
    const { transactionRequest } = tx;
    expectSideEffect('transactionOutbox', state, item =>
      expect(item).toMatchObject({
        transactionRequest,
        processId: expect.any(String),
      }),
    );
  });
};

export const itSendsNoTransaction = (state: SideEffectState) => {
  it(`doesn't send a transaction`, () => {
    expectSideEffect('transactionOutbox', state, item => expect(item).toBeUndefined());
  });
};

export const itTransitionsToStateType = (
  type,
  protocolStateWithSharedData: ProtocolStateWithSharedData<{ type: any }>,
) => {
  it(`transitions to ${type}`, () => {
    expect(protocolStateWithSharedData.protocolState.type).toEqual(type);
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

export const itStoresThisCommitment = (
  state: { channelStore: ChannelStore },
  signedCommitment: SignedCommitment,
) => {
  it('stores the commitment in the channel state', () => {
    const channelId = getChannelId(signedCommitment.commitment);
    const channelState = state.channelStore[channelId];
    expect(channelState.lastCommitment).toMatchObject(signedCommitment);
  });
};
