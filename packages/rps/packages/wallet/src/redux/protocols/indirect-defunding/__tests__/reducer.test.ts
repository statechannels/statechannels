import * as scenarios from './scenarios';
import { IndirectDefundingState, IndirectDefundingStateType } from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { getLastMessage } from '../../../state';
import { SignedCommitment } from '../../../../domain';
import { initialize, indirectDefundingReducer } from '../reducer';
import { itRelaysTheseActions } from '../../../__tests__/helpers';

describe('player A happy path', () => {
  const scenario = scenarios.playerAHappyPath;
  const {
    processId,
    channelId,
    ledgerId,
    store,
    proposedAllocation,
    proposedDestination,
    relayActions,
  } = scenario.initialParams;

  describe('when initializing', () => {
    const result = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      store,
    );
    itTransitionsTo(result, 'IndirectDefunding.WaitForLedgerUpdate');
    itRelaysTheseActions(result, relayActions);
  });

  describe('when in WaitForLedgerUpdate', () => {
    const { state, action, reply } = scenario.waitForLedgerUpdate;
    const updatedState = indirectDefundingReducer(state.state, state.store, action);
    itTransitionsTo(updatedState, 'IndirectDefunding.WaitForConclude');
    itSendsMessage(updatedState, reply);
  });
  describe('when in WaitForConclude', () => {
    const { state, action } = scenario.waitForConclude;
    const updatedState = indirectDefundingReducer(state.state, state.store, action);
    itTransitionsTo(updatedState, 'IndirectDefunding.Success');
  });
});

describe('player A invalid commitment', () => {
  const scenario = scenarios.playerAInvalidCommitment;

  describe('when in WaitForLedgerUpdate', () => {
    const { state, action } = scenario.waitForLedgerUpdate;
    const updatedState = indirectDefundingReducer(state.state, state.store, action);
    itTransitionsTo(updatedState, 'IndirectDefunding.Failure');
  });
});

describe('player B happy path', () => {
  const scenario = scenarios.playerBHappyPath;
  const {
    processId,
    channelId,
    ledgerId,
    store,
    proposedAllocation,
    proposedDestination,
  } = scenario.initialParams;

  describe('when initializing', () => {
    const result = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      store,
    );
    itTransitionsTo(result, 'IndirectDefunding.WaitForLedgerUpdate');
  });

  describe('when in WaitForLedgerUpdate', () => {
    const { state, action, reply } = scenario.waitForLedgerUpdate;
    const updatedState = indirectDefundingReducer(state.state, state.store, action);
    itTransitionsTo(updatedState, 'IndirectDefunding.WaitForConclude');
    itSendsMessage(updatedState, reply);
  });

  describe('when in WaitForConclude', () => {
    const { state, action, reply } = scenario.waitForConclude;
    const updatedState = indirectDefundingReducer(state.state, state.store, action);
    itTransitionsTo(updatedState, 'IndirectDefunding.Success');
    itSendsMessage(updatedState, reply);
  });
});

describe('player B invalid commitment', () => {
  const scenario = scenarios.playerBInvalidCommitment;

  describe('when in WaitForLedgerUpdate', () => {
    const { state, action } = scenario.waitForLedgerUpdate;
    const updatedState = indirectDefundingReducer(state.state, state.store, action);
    itTransitionsTo(updatedState, 'IndirectDefunding.Failure');
  });
});

describe('not defundable', () => {
  const scenario = scenarios.notDefundable;
  const {
    processId,
    channelId,
    ledgerId,
    store,
    proposedAllocation,
    proposedDestination,
  } = scenario.initialParams;
  describe('when initializing', () => {
    const result = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      store,
    );
    itTransitionsTo(result, 'IndirectDefunding.Failure');
  });
});

type ReturnVal = ProtocolStateWithSharedData<IndirectDefundingState>;
function itTransitionsTo(state: ReturnVal, type: IndirectDefundingStateType) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}

function itSendsMessage(state: ReturnVal, message: SignedCommitment) {
  it('sends a message', () => {
    const lastMessage = getLastMessage(state.sharedData);
    if (lastMessage && 'messagePayload' in lastMessage) {
      const dataPayload = lastMessage.messagePayload;
      // This is yuk. The data in a message is currently of 'any' type..
      if (!('signedCommitment' in dataPayload)) {
        fail('No signedCommitment in the last message.');
      }
      const { commitment, signature } = dataPayload.signedCommitment;
      expect({ commitment, signature }).toEqual(message);
    } else {
      fail('No messages in the outbox.');
    }
  });
}
