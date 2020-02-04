import {bigNumberify} from "ethers/utils";

import * as states from "../states";
import * as actions from "../actions";

import {setChannels} from "../../../state";
import {
  channelId,
  bsAddress,
  asAddress,
  appState,
  asPrivateKey
} from "../../../__tests__/state-helpers";
import {preSuccess as ledgerFundingPreSuccess} from "../../ledger-funding/__tests__";
import {preSuccess as virtualFundingPreSuccess} from "../../virtual-funding/__tests__";
import {preSuccess as advanceChannelPreSuccess} from "../../advance-channel/__tests__";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import {prependToLocator} from "../..";
import {EmbeddedProtocol} from "../../../../communication";
import {
  indirectPreSuccess as indirectNegotiationPreSuccess,
  virtualPreSuccess as virtualNegotiationPreSuccess
} from "../../funding-strategy-negotiation/player-a/__tests__";
import {createSharedDataFromParticipants, mergeSharedData} from "../../../__tests__/helpers";
import {HUB_ADDRESS} from "../../../../constants";

// ---------
// Test data
// ---------
const processId = "process-id.123";
const targetChannelId = channelId;
const opponentAddress = bsAddress;
const ourAddress = asAddress;

const props = {
  processId,
  targetChannelId,
  opponentAddress,
  ourAddress
};
const oneThree = [
  {address: asAddress, wei: bigNumberify(1).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()}
];
const app0 = appState({turnNum: 0, balances: oneThree});
const app1 = appState({turnNum: 1, balances: oneThree});
const app2 = appState({turnNum: 2, balances: oneThree});
const app3 = appState({turnNum: 3, balances: oneThree});
const participantsSharedData = createSharedDataFromParticipants([
  asAddress,
  bsAddress,
  HUB_ADDRESS
]);
const appChannelWaitingForFunding = channelFromStates([app0, app1], asAddress, asPrivateKey);
const successSharedData = setChannels(participantsSharedData, [
  channelFromStates([app2, app3], asAddress, asPrivateKey)
]);
// ----
// States
// ------

const waitForIndirectStrategyNegotiation = states.waitForStrategyNegotiation({
  ...props,
  fundingStrategyNegotiationState: indirectNegotiationPreSuccess.state
});
const waitForVirtualStrategyNegotiation = states.waitForStrategyNegotiation({
  ...props,
  fundingStrategyNegotiationState: virtualNegotiationPreSuccess.state
});
const waitForLedgerFunding = states.waitForLedgerFunding({
  ...props,
  fundingState: ledgerFundingPreSuccess.state,
  postFundSetupState: advanceChannelPreSuccess.state
});
const waitForVirtualFunding = states.waitForVirtualFunding({
  ...props,
  fundingState: virtualFundingPreSuccess.state,
  postFundSetupState: advanceChannelPreSuccess.state
});
const waitForPostFundSetup = states.waitForPostFundSetup({
  ...props,
  postFundSetupState: advanceChannelPreSuccess.state
});
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);

// -------
// Actions
// -------

const successConfirmed = actions.fundingSuccessAcknowledged({processId});
const ledgerFundingSuccess = prependToLocator(
  ledgerFundingPreSuccess.action,
  EmbeddedProtocol.LedgerFunding
);

// ---------
// Scenarios
// ---------
export const ledgerFunding = {
  ...props,

  waitForStrategyNegotiation: {
    state: waitForIndirectStrategyNegotiation,
    sharedData: mergeSharedData(
      setChannels(ledgerFundingPreSuccess.sharedData, [appChannelWaitingForFunding]),
      participantsSharedData
    ),
    action: indirectNegotiationPreSuccess.action
  },
  waitForLedgerFunding: {
    state: waitForLedgerFunding,
    sharedData: ledgerFundingPreSuccess.sharedData,
    action: ledgerFundingSuccess
  },
  waitForPostFundSetup: {
    state: waitForPostFundSetup,
    sharedData: advanceChannelPreSuccess.sharedData,
    action: advanceChannelPreSuccess.trigger
  },
  waitForSuccessConfirmation: {
    state: waitForSuccessConfirmation,
    sharedData: successSharedData,
    action: successConfirmed
  }
};

export const virtualFunding = {
  ...props,
  waitForStrategyNegotiation: {
    state: waitForVirtualStrategyNegotiation,
    sharedData: mergeSharedData(
      setChannels(virtualFundingPreSuccess.sharedData, [
        channelFromStates([app2, app3], asAddress, asPrivateKey)
      ]),
      participantsSharedData
    ),
    action: virtualNegotiationPreSuccess.action
  },

  waitForVirtualFunding: {
    state: waitForVirtualFunding,
    sharedData: setChannels(virtualFundingPreSuccess.sharedData, [
      channelFromStates([app2, app3], asAddress, asPrivateKey)
    ]),
    action: virtualFundingPreSuccess.action
  }
};
