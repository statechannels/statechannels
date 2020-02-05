import _ from "lodash";

import {encodeConsensusData} from "@statechannels/nitro-protocol";

import * as states from "../states";

import {setChannel} from "../../../state";
import * as scenarios from "../../../__tests__/state-helpers";
import {preFund, postFund} from "../../advance-channel/__tests__";
import {preSuccess as ledgerFundingPreSuccess} from "../../ledger-funding/__tests__";
import {
  threePlayerPreSuccessA as consensusUpdatePreSuccess,
  threePlayerInProgressA as consensusUpdateInProgress
} from "../../consensus-update/__tests__";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import {twoThree} from "../../../__tests__/state-helpers";
import {CONSENSUS_LIBRARY_ADDRESS} from "../../../../constants";
import {prependToLocator} from "../..";
import {EmbeddedProtocol} from "../../../../communication";
import {ADVANCE_CHANNEL_PROTOCOL_LOCATOR} from "../../advance-channel/reducer";
import {StateType} from "../../advance-channel/states";

import {TwoPartyPlayerIndex} from "../../../types";
import {createSharedDataFromParticipants} from "../../../__tests__/helpers";

// ---------
// Test data
// ---------
const processId = "Process.123";
const {asAddress, asPrivateKey, threeParticipants: destination} = scenarios;
const appDefinition = CONSENSUS_LIBRARY_ADDRESS;

const app0 = scenarios.appState({turnNum: 0, balances: twoThree});
const app1 = scenarios.appState({turnNum: 1, balances: twoThree});
const appChannel = channelFromStates([app0, app1], asAddress, asPrivateKey);
const targetChannelId = appChannel.channelId;
const hubAddress = destination[2];
const jointChannelId = ledgerFundingPreSuccess.state.existingLedgerFundingState.ledgerId;
const startingOutcome = app0.state.outcome;
const {participants} = app0.state.channel;

const initializeArgs = {
  startingOutcome,
  participants,
  appDefinition,
  appData: encodeConsensusData({furtherVotesRequired: 0, proposedOutcome: []}),
  processId,
  clearedToSend: true,
  // To properly test the embedded advanceChannel protocols, it's useful to be playerA
  // to make sure that the states get sent.
  address: asAddress,
  privateKey: asPrivateKey,
  ourIndex: 0,
  stateType: StateType.PreFundSetup,
  targetChannelId,
  hubAddress,
  protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR
};
const participantSharedData = createSharedDataFromParticipants([
  asAddress,
  scenarios.bsAddress,
  hubAddress
]);
const props = {
  targetChannelId,
  processId,
  jointChannelId,
  startingOutcome,
  participants,
  hubAddress,
  ourIndex: TwoPartyPlayerIndex.A,
  protocolLocator: [],
  ourAddress: asAddress
};

// ----
// States
// ------

const scenarioStates = {
  waitForJointChannel1: states.waitForJointChannel({
    ...props,
    jointChannel: preFund.preSuccess.state
  }),
  waitForJointChannel2: states.waitForJointChannel({
    ...props,
    jointChannel: {
      ...preFund.preSuccess.state,
      stateType: StateType.PostFundSetup
    }
  }),

  waitForGuarantorChannel1: states.waitForGuarantorChannel({
    ...props,
    guarantorChannel: preFund.preSuccess.state,
    jointChannelId
  }),
  waitForGuarantorChannel2: states.waitForGuarantorChannel({
    ...props,
    guarantorChannel: postFund.preSuccess.state,
    jointChannelId
  }),
  waitForGuarantorFunding: states.waitForGuarantorFunding({
    ...props,
    indirectGuarantorFunding: ledgerFundingPreSuccess.state,
    indirectApplicationFunding: consensusUpdatePreSuccess.state,
    jointChannelId
  }),
  waitForApplicationFunding: states.waitForApplicationFunding({
    ...props,
    indirectApplicationFunding: consensusUpdatePreSuccess.state
  })
};

// -------
// Shared Data
// -------

// -------
// Actions
// -------

// ---------
// Scenarios
// ---------

export const appFundingStateReceivedEarly = {
  appFundingStateReceivedEarly: {
    appChannelId: appChannel.channelId,
    state: scenarioStates.waitForGuarantorFunding,
    action: consensusUpdateInProgress.action,
    sharedData: consensusUpdateInProgress.sharedData
  },
  fundingSuccess: {
    state: scenarioStates.waitForGuarantorFunding,
    action: prependToLocator(ledgerFundingPreSuccess.action, EmbeddedProtocol.LedgerFunding),
    sharedData: _.merge(consensusUpdatePreSuccess.sharedData, ledgerFundingPreSuccess.sharedData)
  }
};

export const happyPath = {
  ...props,
  initialize: {
    args: initializeArgs,
    sharedData: setChannel(participantSharedData, appChannel)
  },
  openJ: {
    state: scenarioStates.waitForJointChannel1,
    action: preFund.preSuccess.trigger,
    sharedData: setChannel(preFund.preSuccess.sharedData, appChannel)
  },
  prepareJ: {
    state: scenarioStates.waitForJointChannel2,
    action: postFund.preSuccess.trigger,
    sharedData: setChannel(postFund.preSuccess.sharedData, appChannel),
    jointChannelId
  },
  openG: {
    state: scenarioStates.waitForGuarantorChannel1,
    action: preFund.preSuccess.trigger,
    sharedData: setChannel(preFund.preSuccess.sharedData, appChannel)
  },
  prepareG: {
    state: scenarioStates.waitForGuarantorChannel2,
    action: postFund.preSuccess.trigger,
    sharedData: _.merge(
      ledgerFundingPreSuccess.sharedData,
      setChannel(postFund.preSuccess.sharedData, appChannel)
    )
  },
  fundG: {
    appChannelId: appChannel.channelId,
    state: scenarioStates.waitForGuarantorFunding,
    action: prependToLocator(ledgerFundingPreSuccess.action, EmbeddedProtocol.LedgerFunding),
    sharedData: ledgerFundingPreSuccess.sharedData
  },
  fundApp: {
    state: scenarioStates.waitForApplicationFunding,
    action: consensusUpdatePreSuccess.action,
    sharedData: consensusUpdatePreSuccess.sharedData
  }
};
