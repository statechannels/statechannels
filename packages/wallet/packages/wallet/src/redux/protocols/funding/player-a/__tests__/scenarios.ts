import * as states from '../states';
import * as actions from '../actions';
import { TwoPartyPlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA, setChannels } from '../../../../state';
import { FundingStrategy } from '../..';
import {
  channelId,
  bsAddress,
  asAddress,
  appCommitment,
  asPrivateKey,
} from '../../../../../domain/commitments/__tests__';
import { preSuccess as indirectFundingPreSuccess } from '../../../indirect-funding/__tests__';
import { preSuccess as advanceChannelPreSuccess } from '../../../advance-channel/__tests__';
import { bigNumberify } from 'ethers/utils';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';

// To test all paths through the state machine we will use 4 different scenarios:
//
// 1. Happy path: WaitForStrategyChoice
//             -> WaitForStrategyResponse
//             -> WaitForFunding
//             -> WaitForSuccessConfirmation
//             -> Success
//
// 2. WaitForStrategyResponse --> |StrategyRejected| WaitForStrategyChoice
//
// 3. WaitForStrategyChoice   --> |Cancelled| Failure
// 4. WaitForStrategyResponse --> |Cancelled| Failure

// ---------
// Test data
// ---------
const processId = 'process-id.123';
const strategy: FundingStrategy = 'IndirectFundingStrategy';
const targetChannelId = channelId;
const opponentAddress = bsAddress;
const ourAddress = asAddress;

const props = {
  processId,
  targetChannelId,
  opponentAddress,
  strategy,
  ourAddress,
};
const oneThree = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];
const app0 = appCommitment({ turnNum: 0, balances: oneThree });
const app1 = appCommitment({ turnNum: 1, balances: oneThree });
const app2 = appCommitment({ turnNum: 2, balances: oneThree });
const app3 = appCommitment({ turnNum: 3, balances: oneThree });
const successSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app2, app3], asAddress, asPrivateKey),
]);
const preFundSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app0, app1], asAddress, asPrivateKey),
]);
// ----
// States
// ------
const waitForStrategyChoice = states.waitForStrategyChoice(props);

const waitForStrategyResponse = states.waitForStrategyResponse(props);
const waitForIndirectFunding = states.waitForFunding({
  ...props,
  fundingState: indirectFundingPreSuccess.state,
  postFundSetupState: advanceChannelPreSuccess.state,
});
const waitForPostFundSetup = states.waitForPostFundSetup({
  ...props,
  postFundSetupState: advanceChannelPreSuccess.state,
});
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);

// -------
// Actions
// -------
const strategyChosen = actions.strategyChosen({ processId, strategy });
const strategyApproved = actions.strategyApproved({ processId });
const successConfirmed = actions.fundingSuccessAcknowledged({ processId });
const fundingSuccess = indirectFundingPreSuccess.action;
const strategyRejected = actions.strategyRejected({ processId });
const cancelledByA = actions.cancelled({ processId, by: TwoPartyPlayerIndex.A });
const cancelledByB = actions.cancelled({ processId, by: TwoPartyPlayerIndex.B });

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: EMPTY_SHARED_DATA,
    action: strategyChosen,
  },
  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: preFundSharedData,
    action: strategyApproved,
  },
  waitForFunding: {
    state: waitForIndirectFunding,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: fundingSuccess,
  },
  waitForPostFundSetup: {
    state: waitForPostFundSetup,
    sharedData: advanceChannelPreSuccess.sharedData,
    action: advanceChannelPreSuccess.trigger,
  },
  waitForSuccessConfirmation: {
    state: waitForSuccessConfirmation,
    sharedData: successSharedData,
    action: successConfirmed,
  },
};

export const rejectedStrategy = {
  ...props,

  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: strategyRejected,
  },
};

export const cancelledByUser = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByA,
  },
  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: cancelledByA,
  },
};

export const cancelledByOpponent = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByB,
  },
  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: cancelledByB,
  },
};
