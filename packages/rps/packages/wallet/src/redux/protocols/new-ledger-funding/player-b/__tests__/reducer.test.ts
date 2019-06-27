import * as scenarios from './scenarios';
import { playerBReducer, initialize } from '../reducer';
import { ProtocolStateWithSharedData } from '../../..';
import { NewLedgerFundingState, NewLedgerFundingStateType } from '../../states';
import { SignedCommitment } from '../../../../../domain';
import { getLastMessage } from '../../../../state';
import { describeScenarioStep } from '../../../../__tests__/helpers';

describe('happy-path scenario', () => {
  const scenario = scenarios.happyPath;
  describe('when initializing', () => {
    const { channelId, store, processId } = scenario.initialParams;
    const initialState = initialize(processId, channelId, store);

    itTransitionsTo(initialState, 'NewLedgerFunding.BWaitForPreFundSetup0');
  });

  describeScenarioStep(scenario.waitForPreFundSetup0, () => {
    const { state, action, reply } = scenario.waitForPreFundSetup0;
    const updatedState = playerBReducer(state.state, state.store, action);

    itSendsMessage(updatedState, reply);
    itTransitionsTo(updatedState, 'NewLedgerFunding.BWaitForDirectFunding');
  });
  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const { state, action } = scenario.waitForDirectFunding;
    const updatedState = playerBReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.BWaitForLedgerUpdate0');
  });
  describeScenarioStep(scenario.waitForLedgerUpdate0, () => {
    const { state, action, reply } = scenario.waitForLedgerUpdate0;
    const updatedState = playerBReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.BWaitForPostFundSetup0');
    itSendsMessage(updatedState, reply);
  });
  describeScenarioStep(scenario.waitForPostFund0, () => {
    const { state, action, reply } = scenario.waitForPostFund0;
    const updatedState = playerBReducer(state.state, state.store, action);
    itUpdatesFundingState(
      updatedState,
      scenario.initialParams.channelId,
      scenario.initialParams.ledgerId,
    );
    itTransitionsTo(updatedState, 'NewLedgerFunding.Success');
    itSendsMessage(updatedState, reply);
  });
});

describe('ledger-funding-fails scenario', () => {
  const scenario = scenarios.ledgerFundingFails;
  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const { state, action } = scenario.waitForDirectFunding;
    const updatedState = playerBReducer(state.state, state.store, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.Failure');
  });
});

// -------
// Helpers
// -------
type ReturnVal = ProtocolStateWithSharedData<NewLedgerFundingState>;

function itTransitionsTo(state: ReturnVal, type: NewLedgerFundingStateType) {
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
