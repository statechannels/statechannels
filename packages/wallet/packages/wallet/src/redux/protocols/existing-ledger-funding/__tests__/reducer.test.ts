import * as scenarios from './scenarios';
import { initialize, existingLedgerFundingReducer } from '../reducer';
import * as states from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { getLastMessage } from '../../../state';
import { SignedCommitment } from '../../../../domain';
import { describeScenarioStep } from '../../../__tests__/helpers';

describe('player A happy path', () => {
  const scenario = scenarios.playerAFullyFundedHappyPath;

  describe('when initializing', () => {
    const {
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
    } = scenario.initialize;

    const result = initialize(
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
    );
    itTransitionsTo(result, 'ExistingLedgerFunding.WaitForLedgerUpdate');
    itSendsMessage(result, scenario.initialize.reply);
  });

  describeScenarioStep(scenario.waitForLedgerUpdate, () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = existingLedgerFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingLedgerFunding.Success');
  });
});

describe('player B happy path', () => {
  const scenario = scenarios.playerBFullyFundedHappyPath;

  describe('when initializing', () => {
    const {
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
    } = scenario.initialize;

    const result = initialize(
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
    );
    itTransitionsTo(result, 'ExistingLedgerFunding.WaitForLedgerUpdate');
  });

  describeScenarioStep(scenario.waitForLedgerUpdate, () => {
    const { state, action, sharedData, reply } = scenario.waitForLedgerUpdate;
    const updatedState = existingLedgerFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingLedgerFunding.Success');
    itSendsMessage(updatedState, reply);
  });
});

describe('player A invalid ledger commitment', () => {
  const scenario = scenarios.playerAInvalidUpdateCommitment;
  describe('when in WaitForLedgerUpdate', () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = existingLedgerFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingLedgerFunding.Failure');
  });
});

describe('player A top up needed', () => {
  const scenario = scenarios.playerATopUpNeeded;
  describe('when initializing', () => {
    const {
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
    } = scenario.initialize;

    const result = initialize(
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
    );
    itTransitionsTo(result, 'ExistingLedgerFunding.WaitForLedgerTopUp');
  });
});

describe('player B invalid ledger update commitment', () => {
  const scenario = scenarios.playerBInvalidUpdateCommitment;
  describe('when in WaitForLedgerUpdate', () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = existingLedgerFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingLedgerFunding.Failure');
  });
});

describe('player B top up needed', () => {
  const scenario = scenarios.playerATopUpNeeded;
  describe('when initializing', () => {
    const {
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
    } = scenario.initialize;

    const result = initialize(
      processId,
      channelId,
      ledgerId,
      targetAllocation,
      targetDestination,
      protocolLocator,
      sharedData,
    );
    itTransitionsTo(result, 'ExistingLedgerFunding.WaitForLedgerTopUp');
  });
});

type ReturnVal = ProtocolStateWithSharedData<states.ExistingLedgerFundingState>;
function itTransitionsTo(state: ReturnVal, type: states.ExistingLedgerFundingState['type']) {
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
