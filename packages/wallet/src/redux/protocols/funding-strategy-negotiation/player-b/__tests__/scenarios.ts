import * as states from "../states";
import * as actions from "../actions";
import {TwoPartyPlayerIndex} from "../../../../types";

import {FundingStrategy} from "../../../../../communication";
import {channelId, asAddress, bsAddress} from "../../../../__tests__/state-helpers";
import {createSharedDataFromParticipants} from "../../../../__tests__/helpers";

// ---------
// Test data
// ---------
const processId = "process-id.123";
const targetChannelId = channelId;
const opponentAddress = asAddress;
const ourAddress = bsAddress;
const strategy: FundingStrategy = "IndirectFundingStrategy";
const props = {
  targetChannelId,
  processId,
  opponentAddress,
  strategy,
  ourAddress,
  protocolLocator: []
};

const participantsSharedData = createSharedDataFromParticipants([ourAddress, opponentAddress]);

// ------
// States
// ------
const waitForStrategyProposal = states.waitForStrategyProposal(props);

const waitForIndirectStrategyApproval = states.waitForStrategyApproval(props);
const waitForVirtualStrategyApproval = states.waitForStrategyApproval({
  ...props,
  strategy: "VirtualFundingStrategy"
});
export const indirectSuccess = states.success({
  selectedFundingStrategy: "IndirectFundingStrategy"
});
export const virtualSuccess = states.success({selectedFundingStrategy: "VirtualFundingStrategy"});
// ------
// Shared Data
// ------

// -------
// Actions
// -------
const indirectStrategyProposed = actions.strategyProposed({processId, strategy});
const indirectStrategyApproved = actions.strategyApproved({processId, strategy});
const virtualStrategyProposed = actions.strategyProposed({
  processId,
  strategy: "VirtualFundingStrategy"
});
const virtualStrategyApproved = actions.strategyApproved({
  processId,
  strategy: "VirtualFundingStrategy"
});

const strategyRejected = actions.strategyRejected({processId});
const cancelledByB = actions.cancelled({processId, by: TwoPartyPlayerIndex.B});
const cancelledByA = actions.cancelled({processId, by: TwoPartyPlayerIndex.A});

// ---------
// Scenarios
// ---------
export const indirectStrategyChosen = {
  ...props,
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: participantsSharedData,
    action: indirectStrategyProposed
  },
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: participantsSharedData,
    action: indirectStrategyApproved
  }
};
export const virtualStrategyChosen = {
  ...props,
  strategy: "VirtualFundingStrategy",
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: participantsSharedData,
    action: virtualStrategyProposed
  },
  waitForStrategyApproval: {
    state: waitForVirtualStrategyApproval,
    sharedData: participantsSharedData,
    action: virtualStrategyApproved
  }
};

export const rejectedStrategy = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: participantsSharedData,
    action: strategyRejected
  }
};

export const cancelledByOpponent = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: participantsSharedData,
    action: cancelledByA
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: participantsSharedData,
    action: cancelledByA
  }
};

export const cancelledByUser = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: participantsSharedData,
    action: cancelledByB
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: participantsSharedData,
    action: cancelledByB
  }
};
