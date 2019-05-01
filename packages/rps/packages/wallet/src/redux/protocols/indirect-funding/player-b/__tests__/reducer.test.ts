import * as scenarios from './scenarios';
import { playerBReducer, initialize } from '../reducer';
import { ProtocolStateWithSharedData } from '../../../../protocols';
import { IndirectFundingState } from '../../state';
import { SignedCommitment } from '../../../../../domain';
import { getLastMessage } from '../../../../state';

describe('happy-path scenario', () => {
  const scenario = scenarios.happyPath;
  describe('initializing', () => {
    const { channelId, store } = scenario.initialParams;
    const initialState = initialize(channelId, store);

    itTransitionsTo(initialState, 'BWaitForPreFundSetup0');
  });

  describe('when in WaitForPreFundSetup0', () => {
    const { state, action, reply } = scenario.waitForPreFundSetup0;
    const updatedState = playerBReducer(state.state, state.store, action);

    itSendsMessage(updatedState, reply);
    itTransitionsTo(updatedState, 'BWaitForDirectFunding');
  });
  describe('when in WaitForDirectFunding', () => {
    const { state, action } = scenario.waitForDirectFunding;
    const updatedState = playerBReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'BWaitForLedgerUpdate0');
  });
  describe('when in WaitForLedgerUpdate0', () => {
    const { state, action, reply } = scenario.waitForLedgerUpdate0;
    const updatedState = playerBReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'BWaitForPostFundSetup0');
    itSendsMessage(updatedState, reply);
  });
  describe('when in WaitForPostFund0', () => {
    const { state, action, reply } = scenario.waitForPostFund0;
    const updatedState = playerBReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'Success');
    itSendsMessage(updatedState, reply);
  });
});

describe('ledger-funding-fails scenario', () => {
  const scenario = scenarios.ledgerFundingFails;
  describe('when in WaitForDirectFunding', () => {
    const { state, action } = scenario.waitForDirectFunding;
    const updatedState = playerBReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'Failure');
  });
});

// -------
// Helpers
// -------
type ReturnVal = ProtocolStateWithSharedData<IndirectFundingState>;

function itTransitionsTo(state: ReturnVal, type: IndirectFundingState['type']) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}

function itSendsMessage(state: ReturnVal, message: SignedCommitment) {
  it('sends a message', () => {
    const lastMessage = getLastMessage(state.sharedData);
    if (lastMessage && 'messagePayload' in lastMessage) {
      const dataPayload = lastMessage.messagePayload.data;
      // This is yuk. The data in a message is currently of 'any' type..
      if (!('commitment' in dataPayload)) {
        fail('No commitment in the last message.');
      }
      if (!('signature' in dataPayload)) {
        fail('No signature in the last message.');
      }
      const { commitment, signature } = dataPayload;
      expect({ commitment, signature }).toEqual(message);
    } else {
      fail('No messages in the outbox.');
    }
  });
}
