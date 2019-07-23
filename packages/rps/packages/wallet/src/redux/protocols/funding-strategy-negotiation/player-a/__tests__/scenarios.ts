import * as states from '../states';
import * as actions from '../actions';
import { TwoPartyPlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';
import { channelId, bsAddress, asAddress } from '../../../../../domain/commitments/__tests__';

import { FundingStrategy } from '../../../../../communication';

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
  protocolLocator: [],
};

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

export const indirectSuccess = states.success({
  selectedFundingStrategy: 'IndirectFundingStrategy',
});
export const virtualSuccess = states.success({ selectedFundingStrategy: 'VirtualFundingStrategy' });

// -------
// Actions
// -------
const chooseIndirectStrategy = actions.strategyChosen({ processId, strategy: indirectStrategy });
const chooseVirtualStrategy = actions.strategyChosen({ processId, strategy: virtualStrategy });
const approveIndirectStrategy = actions.strategyApproved({ processId, strategy: indirectStrategy });
const approveVirtualStrategy = actions.strategyApproved({ processId, strategy: virtualStrategy });

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
    sharedData: EMPTY_SHARED_DATA,
    action: approveIndirectStrategy,
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
    sharedData: EMPTY_SHARED_DATA,
    action: approveVirtualStrategy,
  },
};

export const rejectedStrategy = {
  ...props,

  waitForStrategyResponse: {
    state: waitForIndirectStrategyResponse,
    sharedData: EMPTY_SHARED_DATA,
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
    sharedData: EMPTY_SHARED_DATA,
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
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByB,
  },
};
