import * as states from '../states';
import { initialize, reducer } from '../reducer';
import * as scenarios from './scenarios';
import {
  itSendsTheseCommitments,
  itStoresThisCommitment,
  itRegistersThisChannel,
  itSendsNoMessage,
} from '../../../__tests__/helpers';

const itTransitionsTo = (
  result: states.AdvanceChannelState,
  type: states.AdvanceChannelStateType,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.type).toEqual(type);
  });
};

describe('sending preFundSetup as A', () => {
  const scenario = scenarios.newChannelAsA;
  const { processId, channelId } = scenario;

  describe('when initializing', () => {
    const { sharedData, commitments, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'AdvanceChannel.CommitmentSent');
    itSendsTheseCommitments(result, commitments);
    itStoresThisCommitment(result, commitments[0]);
    itRegistersThisChannel(result, channelId, processId);
  });

  describe('when receiving prefund commitments from b', () => {
    const { commitments, state, sharedData, action } = scenario.receiveFromB;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.CommitmentSent');
    itSendsNoMessage(result);
    itStoresThisCommitment(result, commitments[1]);
  });

  describe('when receiving prefund commitments from the hub', () => {
    const { state, sharedData, action, commitments } = scenario.receiveFromHub;

    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.Success');
    itStoresThisCommitment(result, commitments[2]);
    itSendsNoMessage(result);
  });
});

describe('sending preFundSetup as B', () => {
  const scenario = scenarios.newChannelAsB;
  const { processId, channelId } = scenario;

  describe('when initializing', () => {
    const { sharedData, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'AdvanceChannel.ChannelUnknown');
    itSendsNoMessage(result);
  });

  describe('when receiving prefund commitments from A', () => {
    const { state, sharedData, action, commitments } = scenario.receiveFromA;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.CommitmentSent');
    itStoresThisCommitment(result, commitments[1]);
    itSendsTheseCommitments(result, commitments);
    itRegistersThisChannel(result, channelId, processId);
  });

  describe('when receiving prefund commitments from the hub', () => {
    const { state, sharedData, action, commitments } = scenario.receiveFromHub;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.Success');
    itStoresThisCommitment(result, commitments[2]);
    itSendsNoMessage(result);
  });
});

describe('sending preFundSetup as Hub', () => {
  const scenario = scenarios.newChannelAsHub;
  const { processId, channelId } = scenario;

  describe('when initializing', () => {
    const { sharedData, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'AdvanceChannel.ChannelUnknown');
    itSendsNoMessage(result);
  });

  describe('when receiving prefund commitments from A', () => {
    const { state, sharedData, action, commitments } = scenario.receiveFromA;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.ChannelUnknown');
    itStoresThisCommitment(result, commitments[0]);
    itSendsNoMessage(result);
  });

  describe('when receiving prefund commitments from B', () => {
    const { state, sharedData, action, commitments } = scenario.receiveFromB;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.Success');
    itStoresThisCommitment(result, commitments[2]);
    itSendsTheseCommitments(result, commitments);
    itRegistersThisChannel(result, channelId, processId);
  });
});

describe('sending postFundSetup as A', () => {
  const scenario = scenarios.existingChannelAsA;

  describe('when initializing', () => {
    const { sharedData, commitments, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'AdvanceChannel.CommitmentSent');
    itSendsTheseCommitments(result, commitments);
    itStoresThisCommitment(result, commitments[2]);
  });

  describe('when receiving postFund commitments from b', () => {
    const { commitments, state, sharedData, action } = scenario.receiveFromB;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.CommitmentSent');
    itSendsNoMessage(result);
    itStoresThisCommitment(result, commitments[2]);
  });

  describe('when receiving postfund commitments from the hub', () => {
    const { state, sharedData, action, commitments } = scenario.receiveFromHub;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.Success');
    itStoresThisCommitment(result, commitments[2]);
    itSendsNoMessage(result);
  });
});

describe('sending postFundSetup as B', () => {
  const scenario = scenarios.existingChannelAsB;

  describe('when initializing', () => {
    const { sharedData, commitments, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'AdvanceChannel.NotSafeToSend');
    itSendsNoMessage(result);
    itStoresThisCommitment(result, commitments[2]);
  });

  describe('when receiving a PostFund commitment from A', () => {
    const { commitments, state, sharedData, action } = scenario.receiveFromA;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.CommitmentSent');
    itSendsTheseCommitments(result, commitments);
    itStoresThisCommitment(result, commitments[2]);
  });

  describe('when receiving postfund commitments from the hub', () => {
    const { state, sharedData, action, commitments } = scenario.receiveFromHub;

    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.Success');
    itStoresThisCommitment(result, commitments[2]);
    itSendsNoMessage(result);
  });
});

describe('sending postFundSetup as Hub', () => {
  const scenario = scenarios.existingChannelAsHub;

  describe('when initializing', () => {
    const { sharedData, commitments, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'AdvanceChannel.NotSafeToSend');
    itSendsNoMessage(result);
    itStoresThisCommitment(result, commitments[2]);
  });

  describe('when receiving postfund commitments from the hub', () => {
    const { state, sharedData, action, commitments } = scenario.receiveFromB;

    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.Success');
    itStoresThisCommitment(result, commitments[2]);
    itSendsTheseCommitments(result, commitments);
  });
});

describe('when not cleared to send', () => {
  const scenario = scenarios.notClearedToSend;

  describe('when initializing', () => {
    const { sharedData, commitments, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'AdvanceChannel.NotSafeToSend');
    itSendsNoMessage(result);
    itStoresThisCommitment(result, commitments[2]);
    itIsNotClearedToSend(protocolState);
  });

  describe('when cleared to send, and it is safe to send', () => {
    const { state, sharedData, action, commitments } = scenario.clearedToSend;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.CommitmentSent');
    itStoresThisCommitment(result, commitments[2]);
    itSendsTheseCommitments(result, commitments);
  });

  describe('when cleared to send, and it is unsafe to send', () => {
    const { state, sharedData, action, commitments } = scenario.clearedToSendButUnsafe;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.NotSafeToSend');
    itStoresThisCommitment(result, commitments[1]);
    itSendsNoMessage(result);
    itIsClearedToSend(protocolState);
  });

  describe('when cleared to send, and the channel is unknown', () => {
    const { state, sharedData, action } = scenario.clearedToSendButChannelUnknown;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.ChannelUnknown');
    itSendsNoMessage(result);
    itIsClearedToSend(protocolState);
  });

  describe('when cleared to send, but the commitment was already sent', () => {
    const { state, sharedData, action } = scenario.clearedToSendAndAlreadySent;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'AdvanceChannel.CommitmentSent');
    itSendsNoMessage(result);
  });
});

function itIsClearedToSend(protocolState: states.AdvanceChannelState) {
  it('is cleared to send', () => {
    expect(protocolState).toMatchObject({ clearedToSend: true });
  });
}

function itIsNotClearedToSend(protocolState: states.AdvanceChannelState) {
  it('is cleared to send', () => {
    expect(protocolState).toMatchObject({ clearedToSend: false });
  });
}
