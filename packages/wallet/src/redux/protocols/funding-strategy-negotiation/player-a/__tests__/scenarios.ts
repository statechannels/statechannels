import * as states from "../states";
import * as actions from "../actions";
import {TwoPartyPlayerIndex} from "../../../../types";
import {FundingStrategy} from "../../../../../communication";
import {channelId, bsAddress, asAddress} from "../../../../__tests__/state-helpers";
import {createSharedDataFromParticipants} from "../../../../__tests__/helpers";

// ---------
// Test data
// ---------
const processId = "process-id.123";
const indirectStrategy: FundingStrategy = "IndirectFundingStrategy";
const virtualStrategy: FundingStrategy = "VirtualFundingStrategy";
const targetChannelId = channelId;
const opponentAddress = bsAddress;
const ourAddress = asAddress;

const props = {
  processId,
  targetChannelId,
  opponentAddress,
  ourAddress,
  protocolLocator: []
};

const participantsSharedData = createSharedDataFromParticipants([ourAddress, opponentAddress]);

// ----
// States
// ------
const waitForStrategyChoice = states.waitForStrategyChoice(props);
const waitForIndirectStrategyResponse = states.waitForStrategyResponse({
  ...props,
  strategy: indirectStrategy
});
const waitForVirtualStrategyResponse = states.waitForStrategyResponse({
  ...props,
  strategy: virtualStrategy
});

export const indirectSuccess = states.success({
  selectedFundingStrategy: "IndirectFundingStrategy"
});
export const virtualSuccess = states.success({selectedFundingStrategy: "VirtualFundingStrategy"});

// -------
// Actions
// -------
const chooseIndirectStrategy = actions.strategyChosen({processId, strategy: indirectStrategy});
const chooseVirtualStrategy = actions.strategyChosen({processId, strategy: virtualStrategy});
const approveIndirectStrategy = actions.strategyApproved({processId, strategy: indirectStrategy});
const approveVirtualStrategy = actions.strategyApproved({processId, strategy: virtualStrategy});

const strategyRejected = actions.strategyRejected({processId});
const cancelledByA = actions.cancelled({processId, by: TwoPartyPlayerIndex.A});
const cancelledByB = actions.cancelled({processId, by: TwoPartyPlayerIndex.B});

// ---------
// Scenarios
// ---------
export const indirectStrategyChosen = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: participantsSharedData,
    action: chooseIndirectStrategy
  },
  waitForStrategyResponse: {
    state: waitForIndirectStrategyResponse,
    sharedData: participantsSharedData,
    action: approveIndirectStrategy
  }
};

export const virtualStrategyChosen = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: participantsSharedData,
    action: chooseVirtualStrategy
  },
  waitForStrategyResponse: {
    state: waitForVirtualStrategyResponse,
    sharedData: participantsSharedData,
    action: approveVirtualStrategy
  }
};

export const rejectedStrategy = {
  ...props,

  waitForStrategyResponse: {
    state: waitForIndirectStrategyResponse,
    sharedData: participantsSharedData,
    action: strategyRejected
  }
};

export const cancelledByUser = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: participantsSharedData,
    action: cancelledByA
  },
  waitForStrategyResponse: {
    state: waitForIndirectStrategyResponse,
    sharedData: participantsSharedData,
    action: cancelledByA
  }
};

export const cancelledByOpponent = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: participantsSharedData,
    action: cancelledByB
  },
  waitForStrategyResponse: {
    state: waitForIndirectStrategyResponse,
    sharedData: participantsSharedData,
    action: cancelledByB
  }
};
