/* 
TODO Remaining work:
- Check outgoing postfund messages.
- Transaction failure testing.  
 */

import { addHex } from '../../../../utils/hex-utils';
import * as actions from '../../../actions';
import * as globalTestScenarios from '../../../__tests__/test-scenarios';
import { directFundingStateReducer } from '../reducer';
import * as states from '../state';
import * as scenarios from './scenarios';
import * as transactionSubmissionStates from '../../transaction-submission/states';
import { ProtocolStateWithSharedData } from '../..';

const { channelId, twoThree } = globalTestScenarios;

const YOUR_DEPOSIT_A = twoThree[1];
const YOUR_DEPOSIT_B = twoThree[0];
const TOTAL_REQUIRED = twoThree.reduce(addHex);

const startingIn = stage => `start in ${stage}`;
const whenActionArrives = action => `incoming action ${action}`;

describe(startingIn('any state'), () => {
  describe(whenActionArrives(actions.FUNDING_RECEIVED_EVENT), () => {
    describe("When it's for the correct channel", () => {
      describe('when the channel is now funded', () => {
        const state = scenarios.aDepositsBDepositsAHappyStates.notSafeToDeposit;
        const action = actions.fundingReceivedEvent(
          channelId,
          channelId,
          TOTAL_REQUIRED,
          TOTAL_REQUIRED,
        );
        const updatedState = directFundingStateReducer(
          state.protocolState,
          state.sharedData,
          action,
        );
        itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
      });
      describe('when the channel is still not funded', () => {
        const state = scenarios.aDepositsBDepositsBHappyStates.notSafeToDeposit;
        const action = actions.fundingReceivedEvent(
          channelId,
          channelId,
          YOUR_DEPOSIT_B,
          YOUR_DEPOSIT_B,
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
        TOTAL_REQUIRED,
        TOTAL_REQUIRED,
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
        YOUR_DEPOSIT_A,
        YOUR_DEPOSIT_A,
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
        YOUR_DEPOSIT_B,
        TOTAL_REQUIRED,
      );
      const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);

      itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
    });

    describe('when it is still not fully funded', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.waitForFundingAndPostFundSetup;
      const action = actions.fundingReceivedEvent(channelId, channelId, '0x', YOUR_DEPOSIT_A);
      const updatedState = directFundingStateReducer(state.protocolState, state.sharedData, action);

      itTransitionsTo(updatedState, states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP);
    });

    describe('when it is for the wrong channel', () => {
      const state = scenarios.aDepositsBDepositsBHappyStates.waitForFundingAndPostFundSetup;
      const action = actions.fundingReceivedEvent(
        channelId,
        '0 xf00',
        TOTAL_REQUIRED,
        TOTAL_REQUIRED,
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

describe(startingIn(states.FUNDING_SUCCESS), () => {
  it.skip('works', () => {
    expect.assertions(1);
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
