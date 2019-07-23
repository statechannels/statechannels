import * as states from '../states';
import * as actions from '../actions';
import { TwoPartyPlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';
import { FundingStrategy } from '../../../../../communication';
import { channelId, asAddress } from '../../../../../domain/commitments/__tests__';
import { bsAddress } from '../../../../../communication/__tests__/commitments';

// ---------
// Test data
// ---------
const processId = 'process-id.123';
const targetChannelId = channelId;
const opponentAddress = asAddress;
const ourAddress = bsAddress;
const strategy: FundingStrategy = 'IndirectFundingStrategy';
const props = {
  targetChannelId,
  processId,
  opponentAddress,
  strategy,
  ourAddress,
  protocolLocator: [],
};

// ------
// States
// ------
const waitForStrategyProposal = states.waitForStrategyProposal(props);

const waitForIndirectStrategyApproval = states.waitForStrategyApproval(props);
const waitForVirtualStrategyApproval = states.waitForStrategyApproval({
  ...props,
  strategy: 'VirtualFundingStrategy',
});
export const indirectSuccess = states.success({
  selectedFundingStrategy: 'IndirectFundingStrategy',
});
export const virtualSuccess = states.success({ selectedFundingStrategy: 'VirtualFundingStrategy' });
// ------
// Shared Data
// ------

// -------
// Actions
// -------
const indirectStrategyProposed = actions.strategyProposed({ processId, strategy });
const indirectStrategyApproved = actions.strategyApproved({ processId, strategy });
const virtualStrategyProposed = actions.strategyProposed({
  processId,
  strategy: 'VirtualFundingStrategy',
});
const virtualStrategyApproved = actions.strategyApproved({
  processId,
  strategy: 'VirtualFundingStrategy',
});

const strategyRejected = actions.strategyRejected({ processId });
const cancelledByB = actions.cancelled({ processId, by: TwoPartyPlayerIndex.B });
const cancelledByA = actions.cancelled({ processId, by: TwoPartyPlayerIndex.A });

// ---------
// Scenarios
// ---------
export const indirectStrategyChosen = {
  ...props,
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: EMPTY_SHARED_DATA,
    action: indirectStrategyProposed,
  },
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: EMPTY_SHARED_DATA,
    action: indirectStrategyApproved,
  },
};
export const virtualStrategyChosen = {
  ...props,
  strategy: 'VirtualFundingStrategy',
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: EMPTY_SHARED_DATA,
    action: virtualStrategyProposed,
  },
  waitForStrategyApproval: {
    state: waitForVirtualStrategyApproval,
    sharedData: EMPTY_SHARED_DATA,
    action: virtualStrategyApproved,
  },
};

export const rejectedStrategy = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: EMPTY_SHARED_DATA,
    action: strategyRejected,
  },
};

export const cancelledByOpponent = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByA,
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByA,
  },
};

export const cancelledByUser = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByB,
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByB,
  },
};
