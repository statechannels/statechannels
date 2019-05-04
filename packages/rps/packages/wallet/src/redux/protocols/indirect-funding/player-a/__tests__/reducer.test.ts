import * as scenarios from './scenarios';
import { playerAReducer, initialize } from '../reducer';
import { ProtocolStateWithSharedData } from '../../../../protocols';
import { IndirectFundingState } from '../../state';
import { SignedCommitment } from '../../../../../domain';
import { getLastMessage } from '../../../../state';

describe('happy-path scenario', () => {
  const scenario = scenarios.happyPath;
  describe('initializing', () => {
    const { channelId, store, reply } = scenario.initialParams;
    const initialState = initialize(channelId, store);

    itTransitionsTo(initialState, 'AWaitForPreFundSetup1');
    itSendsMessage(initialState, reply);
  });

  describe('when in WaitForPreFundL1', () => {
    const { state, action } = scenario.waitForPreFundL1;
    const updatedState = playerAReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'AWaitForDirectFunding');
  });
  describe('when in WaitForDirectFunding', () => {
    const { state, action, reply } = scenario.waitForDirectFunding;
    const updatedState = playerAReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'AWaitForLedgerUpdate1');
    itSendsMessage(updatedState, reply);
  });

  describe.skip('when in WaitForLedgerUpdate1', () => {
    const { state, action, reply } = scenario.waitForLedgerUpdate1;
    const updatedState = playerAReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'AWaitForPostFundSetup1');
    itSendsMessage(updatedState, reply);
  });
  describe.skip('when in WaitForPostFund1', () => {
    const { state, action } = scenario.waitForPostFund1;
    const updatedState = playerAReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'Success');
  });
});

describe('ledger-funding-fails scenario', () => {
  const scenario = scenarios.ledgerFundingFails;
  describe('when in WaitForDirectFunding', () => {
    const { state, action } = scenario.waitForDirectFunding;
    const updatedState = playerAReducer(state.state, state.store, action);

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
      if (!('signedCommitment' in dataPayload)) {
        fail('No signed commitment in the last message.');
      }
      const { commitment, signature } = dataPayload.signedCommitment;
      expect({ commitment, signature }).toEqual(message);
    } else {
      fail('No messages in the outbox.');
    }
  });
}
