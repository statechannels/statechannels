import * as scenarios from './scenarios';
import { playerAReducer, initialize } from '../reducer';
import { ProtocolStateWithSharedData } from '../../..';
import { NewLedgerFundingState } from '../../states';
import { SignedCommitment } from '../../../../../domain';
import { getLastMessage } from '../../../../state';
import { describeScenarioStep } from '../../../../__tests__/helpers';
import * as selectors from '../../../../selectors';

// Mocks
const getNextNonceMock = jest.fn().mockReturnValue(0);
Object.defineProperty(selectors, 'getNextNonce', {
  value: getNextNonceMock,
});

describe('happy-path scenario', () => {
  const scenario = scenarios.happyPath;
  describe('when initializing', () => {
    const { channelId, store, reply, processId } = scenario.initialParams;
    const initialState = initialize(processId, channelId, store);

    itTransitionsTo(initialState, 'NewLedgerFunding.AWaitForPreFundSetup1');
    itSendsMessage(initialState, reply);
  });

  describeScenarioStep(scenario.waitForPreFundL1, () => {
    const { state, action } = scenario.waitForPreFundL1;
    const updatedState = playerAReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.AWaitForDirectFunding');
  });

  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const { state, action, reply } = scenario.waitForDirectFunding;
    const updatedState = playerAReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.AWaitForLedgerUpdate1');
    itSendsMessage(updatedState, reply);
  });

  describeScenarioStep(scenario.waitForLedgerUpdate1, () => {
    const { state, action, reply } = scenario.waitForLedgerUpdate1;
    const updatedState = playerAReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.AWaitForPostFundSetup1');
    itSendsMessage(updatedState, reply);
  });

  describeScenarioStep(scenario.waitForPostFund1, () => {
    const { state, action } = scenario.waitForPostFund1;
    const updatedState = playerAReducer(state.state, state.store, action);

    itUpdatesFundingState(
      updatedState,
      scenario.initialParams.channelId,
      scenario.initialParams.ledgerId,
    );
    itTransitionsTo(updatedState, 'NewLedgerFunding.Success');
  });
});

describe('ledger-funding-fails scenario', () => {
  const scenario = scenarios.ledgerFundingFails;

  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const { state, action } = scenario.waitForDirectFunding;
    const updatedState = playerAReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.Failure');
  });
});

// -------
// Helpers
// -------
type ReturnVal = ProtocolStateWithSharedData<NewLedgerFundingState>;

function itTransitionsTo(state: ReturnVal, type: NewLedgerFundingState['type']) {
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

function itUpdatesFundingState(state: ReturnVal, channelId: string, fundingChannelId?: string) {
  it(`Updates the funding state to reflect ${channelId} funded by ${fundingChannelId}`, () => {
    if (!state.sharedData.fundingState[channelId]) {
      fail(`No entry for ${channelId} in fundingState`);
    } else {
      if (!fundingChannelId) {
        expect(state.sharedData.fundingState[channelId].directlyFunded).toBeTruthy();
      } else {
        expect(state.sharedData.fundingState[channelId].directlyFunded).toBeFalsy();
        expect(state.sharedData.fundingState[channelId].fundingChannel).toEqual(fundingChannelId);
      }
    }
  });
}
