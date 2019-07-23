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
import { preSuccess as virtualFundingPreSuccess } from '../../../virtual-funding/__tests__';
import { preSuccess as advanceChannelPreSuccess } from '../../../advance-channel/__tests__';
import { bigNumberify } from 'ethers/utils';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';
import { prependToLocator } from '../../..';
import { EmbeddedProtocol } from '../../../../../communication';

// ---------
// Test data
// ---------
const processId = 'process-id.123';
const indirectStrategy: FundingStrategy = 'IndirectFundingStrategy';
const virtualStrategy: FundingStrategy = 'VirtualFundingStrategy';
const targetChannelId = channelId;
const opponentAddress = bsAddress;
const ourAddress = asAddress;

const props = {
  processId,
  targetChannelId,
  opponentAddress,
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
const appChannelWaitingForFunding = channelFromCommitments([app0, app1], asAddress, asPrivateKey);
const successSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app2, app3], asAddress, asPrivateKey),
]);
// ----
// States
// ------
const waitForStrategyChoice = states.waitForStrategyChoice(props);
const waitForIndirectStrategyResponse = states.waitForStrategyResponse({
  ...props,
  strategy: indirectStrategy,
});
const waitForVirtualStrategyResponse = states.waitForStrategyResponse({
  ...props,
  strategy: virtualStrategy,
});
const waitForIndirectFunding = states.waitForIndirectFunding({
  ...props,
  fundingState: indirectFundingPreSuccess.state,
  postFundSetupState: advanceChannelPreSuccess.state,
});
const waitForVirtualFunding = states.waitForVirtualFunding({
  ...props,
  fundingState: virtualFundingPreSuccess.state,
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
const chooseIndirectStrategy = actions.strategyChosen({ processId, strategy: indirectStrategy });
const chooseVirtualStrategy = actions.strategyChosen({ processId, strategy: virtualStrategy });
const approveIndirectStrategy = actions.strategyApproved({ processId, strategy: indirectStrategy });
const approveVirtualStrategy = actions.strategyApproved({ processId, strategy: virtualStrategy });
const successConfirmed = actions.fundingSuccessAcknowledged({ processId });
const indirectFundingSuccess = prependToLocator(
  indirectFundingPreSuccess.action,
  EmbeddedProtocol.IndirectFunding,
);
const strategyRejected = actions.strategyRejected({ processId });
const cancelledByA = actions.cancelled({ processId, by: TwoPartyPlayerIndex.A });
const cancelledByB = actions.cancelled({ processId, by: TwoPartyPlayerIndex.B });

// ---------
// Scenarios
// ---------
export const indirectStrategyChosen = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: EMPTY_SHARED_DATA,
    action: chooseIndirectStrategy,
  },
  waitForStrategyResponse: {
    state: waitForIndirectStrategyResponse,
    sharedData: setChannels(indirectFundingPreSuccess.sharedData, [appChannelWaitingForFunding]),
    action: approveIndirectStrategy,
  },
  waitForIndirectFunding: {
    state: waitForIndirectFunding,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: indirectFundingSuccess,
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

export const virtualStrategyChosen = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: EMPTY_SHARED_DATA,
    action: chooseVirtualStrategy,
  },
  waitForStrategyResponse: {
    state: waitForVirtualStrategyResponse,
    sharedData: setChannels(virtualFundingPreSuccess.sharedData, [
      channelFromCommitments([app2, app3], asAddress, asPrivateKey),
    ]),
    action: approveVirtualStrategy,
  },
  waitForVirtualFunding: {
    state: waitForVirtualFunding,
    sharedData: setChannels(virtualFundingPreSuccess.sharedData, [
      channelFromCommitments([app2, app3], asAddress, asPrivateKey),
    ]),
    action: virtualFundingPreSuccess.action,
  },
};

export const rejectedStrategy = {
  ...props,

  waitForStrategyResponse: {
    state: waitForIndirectStrategyResponse,
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
    state: waitForIndirectStrategyResponse,
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
    state: waitForIndirectStrategyResponse,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: cancelledByB,
  },
};
