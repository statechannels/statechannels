/* 
TODO Remaining work:
- Check outgoing postfund messages.
*/

import * as actions from '../../../actions';
import * as globalTestScenarios from '../../../__tests__/test-scenarios';
import { directFundingStateReducer } from '../reducer';
import * as states from '../state';
import * as scenarios from './scenarios';
import * as transactionSubmissionStates from '../../transaction-submission/states';
import { ProtocolStateWithSharedData } from '../..';
import { bigNumberify } from 'ethers/utils';
import { expectThisCommitmentSent } from '../../../__tests__/helpers';

const { channelId } = globalTestScenarios;

const startingIn = stage => `start in ${stage}`;
const whenActionArrives = action => `incoming action ${action}`;

describe(startingIn('Any state'), () => {
  describe(whenActionArrives(actions.FUNDING_RECEIVED_EVENT), () => {
    describe("When it's for the correct channel", () => {
      describe('when the channel is now funded', () => {
        const state = scenarios.aDepositsBDepositsAHappyStates.notSafeToDeposit;
        const action = actions.fundingReceivedEvent(
          channelId,
          channelId,
          scenarios.TOTAL_REQUIRED,
          scenarios.TOTAL_REQUIRED,
        );
        const updatedState = directFundingStateReducer(
          state.protocolState,
          state.sharedData,
          action,
        );
        itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
        expectThisCommitmentSent(updatedState.sharedData, globalTestScenarios.postFundCommitment0);
      });
      describe('when the channel is still not funded', () => {
        const state = scenarios.aDepositsBDepositsBHappyStates.notSafeToDeposit;
        const action = actions.fundingReceivedEvent(
          channelId,
          channelId,
          bigNumberify(1).toHexString(),
          bigNumberify(1).toHexString(),
        );
        const updatedState = directFundingStateReducer(
          state.protocolState,
          state.sharedData,
          action,
        );
        itTransitionsTo(updatedState, states.NOT_SAFE_TO_DEPOSIT);
      });
    });

    describe("When it's for another channels", () => {
      const state = scenarios.aDepositsBDepositsAHappyStates.notSafeToDeposit;
      const action = actions.fundingReceivedEvent(
        channelId,
        '0xf00',
        scenarios.TOTAL_REQUIRED,
        scenarios.TOTAL_REQUIRED,
      );
      const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);
      itTransitionsTo(updatedState, states.NOT_SAFE_TO_DEPOSIT);
    });
  });
});

describe(startingIn(states.NOT_SAFE_TO_DEPOSIT), () => {
  // player B scenario
  describe(whenActionArrives(actions.FUNDING_RECEIVED_EVENT), () => {
    describe('when it is now safe to deposit', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.notSafeToDeposit;
      const action = actions.fundingReceivedEvent(
        channelId,
        channelId,
        scenarios.YOUR_DEPOSIT_A,
        scenarios.YOUR_DEPOSIT_A,
      );
      const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);

      itTransitionsTo(updatedState, states.WAIT_FOR_DEPOSIT_TRANSACTION);
      itChangesTransactionSubmissionStatusTo(
        ((updatedState.protocolState as any) as states.WaitForDepositTransaction)
          .transactionSubmissionState,
        'WaitForSend',
      );
    });

    describe('when it is still not safe to deposit', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.notSafeToDeposit;
      const action = actions.fundingReceivedEvent(channelId, channelId, '0x', '0x');
      const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);

      itTransitionsTo(updatedState, states.NOT_SAFE_TO_DEPOSIT);
    });
  });
});

describe(startingIn(states.WAIT_FOR_DEPOSIT_TRANSACTION), () => {
  describe(whenActionArrives(actions.TRANSACTION_CONFIRMED), () => {
    const state = scenarios.aDepositsBDepositsAHappyStates.waitForDepositTransactionEnd;
    const action = actions.transactionConfirmed(channelId);

    const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);
    itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
  });

  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    const state = scenarios.aDepositsBDepositsBHappyStates.waitForDepositTransactionEnd;

    const updatedState = directFundingStateReducer(
      state.protocolState,
      state.sharedData,
      scenarios.actions.postFundSetup0,
    );
    itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
    const protocolState = updatedState.protocolState;
    if (protocolState.type === states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP) {
      expect(protocolState.channelFunded).toBeFalsy();
      expect(protocolState.postFundSetupReceived).toBeTruthy();
    }
  });
});

describe(startingIn(states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP), () => {
  describe(whenActionArrives(actions.FUNDING_RECEIVED_EVENT), () => {
    describe('when it is now fully funded', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.waitForFundingAndPostFundSetup;
      const action = actions.fundingReceivedEvent(
        channelId,
        channelId,
        scenarios.YOUR_DEPOSIT_B,
        scenarios.TOTAL_REQUIRED,
      );
      const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);

      itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
    });

    describe('when it is still not fully funded', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.waitForFundingAndPostFundSetup;
      const action = actions.fundingReceivedEvent(
        channelId,
        channelId,
        '0x',
        scenarios.YOUR_DEPOSIT_A,
      );
      const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);

      itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
    });

    describe('when it is for the wrong channel', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.waitForFundingAndPostFundSetup;
      const action = actions.fundingReceivedEvent(
        channelId,
        '0 xf00',
        scenarios.TOTAL_REQUIRED,
        scenarios.TOTAL_REQUIRED,
      );
      const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);

      itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
    });
  });

  describe(whenActionArrives(actions.COMMITMENT_RECEIVED), () => {
    describe('Player B: channel is funded', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.waitForPostFundSetup;
      const updatedState = directFundingStateReducer(
        state.protocolState,
        state.sharedData,
        scenarios.actions.postFundSetup0,
      );
      itTransitionsTo(updatedState, states.FUNDING_SUCCESS);
      it('sends a commitment', () => {
        expectThisCommitmentSent(updatedState.sharedData, globalTestScenarios.postFundCommitment1);
      });
    });

    describe('Player B: channel is not funded', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.waitForFundingAndPostFundSetup;
      const updatedState = directFundingStateReducer(
        state.protocolState,
        state.sharedData,
        scenarios.actions.postFundSetup0,
      );
      itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
      const protocolState = updatedState.protocolState;
      if (protocolState.type === states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP) {
        expect(protocolState.channelFunded).toBeFalsy();
        expect(protocolState.postFundSetupReceived).toBeTruthy();
      }
    });

    describe('Player A: channel is funded', () => {
      const state = scenarios.aDepositsBDepositsAHappyStates.waitForPostFundSetup;
      const updatedState = directFundingStateReducer(
        state.protocolState,
        state.sharedData,
        scenarios.actions.postFundSetup0,
      );
      itTransitionsTo(updatedState, states.FUNDING_SUCCESS);
    });

    describe('Player A: channel is not funded', () => {
      const state = scenarios.aDepositsBDepositsAHappyStates.waitForFundingAndPostFundSetup;
      const updatedState = directFundingStateReducer(
        state.protocolState,
        state.sharedData,
        scenarios.actions.postFundSetup0,
      );
      itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
      const protocolState = updatedState.protocolState;
      if (protocolState.type === states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP) {
        expect(protocolState.channelFunded).toBeFalsy();
        expect(protocolState.postFundSetupReceived).toBeFalsy();
      }
    });
  });
});

describe('transaction-fails scenario', () => {
  describe('when in WaitForDepositTransaction', () => {
    const state = scenarios.transactionFails.waitForDepositTransaction;
    const action = scenarios.transactionFails.failureTrigger;
    const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);

    itTransitionsTo(updatedState, states.FUNDING_FAILURE);
  });
});

function itTransitionsTo(
  state: ProtocolStateWithSharedData<states.DirectFundingState>,
  type: string,
) {
  it(`transitions state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}

function itChangesTransactionSubmissionStatusTo(
  state: transactionSubmissionStates.TransactionSubmissionState,
  status: transactionSubmissionStates.TransactionSubmissionState['type'],
) {
  it(`changes transaction submission state to ${status}`, () => {
    expect(state.type).toEqual(status);
  });
}
