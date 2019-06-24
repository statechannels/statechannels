import * as scenarios from './scenarios';
import { initialize, existingChannelFundingReducer } from '../reducer';
import * as states from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { getLastMessage } from '../../../state';
import { SignedCommitment } from '../../../../domain';
import { describeScenarioStep } from '../../../__tests__/helpers';

describe('player A happy path', () => {
  const scenario = scenarios.playerAFullyFundedHappyPath;

  describe('when initializing', () => {
    const { processId, channelId, ledgerId, sharedData } = scenario.initialize;

    const result = initialize(processId, channelId, ledgerId, sharedData);
    itTransitionsTo(result, 'ExistingChannelFunding.WaitForLedgerUpdate');
    itSendsMessage(result, scenario.initialize.reply);
  });

  describeScenarioStep(scenario.waitForLedgerUpdate, () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = existingChannelFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingChannelFunding.WaitForPostFundSetup');
  });

  describeScenarioStep(scenario.waitForPostFundSetup, () => {
    const { state, action, sharedData } = scenario.waitForPostFundSetup;
    const updatedState = existingChannelFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingChannelFunding.Success');
  });
});

describe('player B happy path', () => {
  const scenario = scenarios.playerBFullyFundedHappyPath;

  describe('when initializing', () => {
    const { processId, channelId, ledgerId, sharedData } = scenario.initialize;

    const result = initialize(processId, channelId, ledgerId, sharedData);
    itTransitionsTo(result, 'ExistingChannelFunding.WaitForLedgerUpdate');
  });

  describeScenarioStep(scenario.waitForLedgerUpdate, () => {
    const { state, action, sharedData, reply } = scenario.waitForLedgerUpdate;
    const updatedState = existingChannelFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingChannelFunding.WaitForPostFundSetup');
    itSendsMessage(updatedState, reply);
  });

  describeScenarioStep(scenario.waitForPostFundSetup, () => {
    const { state, action, sharedData, reply } = scenario.waitForPostFundSetup;
    const updatedState = existingChannelFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingChannelFunding.Success');
    itSendsMessage(updatedState, reply);
  });
});

describe('player A invalid ledger commitment', () => {
  const scenario = scenarios.playerAInvalidUpdateCommitment;
  describe('when in WaitForLedgerUpdate', () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = existingChannelFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingChannelFunding.Failure');
  });
});

describe('player A invalid post fund commitment', () => {
  const scenario = scenarios.playerAInvalidUpdateCommitment;
  describe('when in WaitForPostFundSetup', () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = existingChannelFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingChannelFunding.Failure');
  });
});

describe('player A top up needed', () => {
  const scenario = scenarios.playerATopUpNeeded;
  describe('when initializing', () => {
    const { processId, channelId, ledgerId, sharedData } = scenario.initialize;

    const result = initialize(processId, channelId, ledgerId, sharedData);
    itTransitionsTo(result, 'ExistingChannelFunding.WaitForLedgerTopUp');
  });
});

describe('player B invalid ledger update commitment', () => {
  const scenario = scenarios.playerBInvalidUpdateCommitment;
  describe('when in WaitForLedgerUpdate', () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = existingChannelFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingChannelFunding.Failure');
  });
});

describe('player B invalid post fund commitment', () => {
  const scenario = scenarios.playerBInvalidPostFundCommitment;
  describe('when in WaitForPostFundSetup', () => {
    const { state, action, sharedData } = scenario.waitForPostFundSetup;
    const updatedState = existingChannelFundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'ExistingChannelFunding.Failure');
  });
});

describe('player B top up needed', () => {
  const scenario = scenarios.playerATopUpNeeded;
  describe('when initializing', () => {
    const { processId, channelId, ledgerId, sharedData } = scenario.initialize;

    const result = initialize(processId, channelId, ledgerId, sharedData);
    itTransitionsTo(result, 'ExistingChannelFunding.WaitForLedgerTopUp');
  });
});

type ReturnVal = ProtocolStateWithSharedData<states.ExistingChannelFundingState>;
function itTransitionsTo(state: ReturnVal, type: states.ExistingChannelFundingState['type']) {
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
