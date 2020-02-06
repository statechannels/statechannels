import _ from "lodash";

import {bigNumberify} from "ethers/utils/bignumber";

import {ethers} from "ethers";

import {encodeConsensusData, convertAddressToBytes32} from "@statechannels/nitro-protocol";

import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import * as scenarios from "../../../__tests__/state-helpers";
import * as states from "../states";
import {setChannel, EMPTY_SHARED_DATA, setFundingState} from "../../../state";

import {EmbeddedProtocol, signedStatesReceived} from "../../../../communication";
import {makeLocator} from "../..";
import * as consensusStates from "../../consensus-update/states";
import {HUB_ADDRESS, ETH_ASSET_HOLDER_ADDRESS} from "../../../../constants";

import {bsAddress} from "../../../__tests__/state-helpers";
import {TwoPartyPlayerIndex} from "../../../types";

// ---------
// Test data
// ---------
const processId = "Process.123";

const {asAddress, asPrivateKey} = scenarios;
const hubAddress = HUB_ADDRESS;
const twoTwo = [
  {address: asAddress, wei: bigNumberify(2).toHexString()},
  {address: hubAddress, wei: bigNumberify(2).toHexString()}
];
const oneThree = [
  {address: asAddress, wei: bigNumberify(1).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()}
];
const oneThreeHub = [
  {address: asAddress, wei: bigNumberify(1).toHexString()},
  {address: hubAddress, wei: bigNumberify(3).toHexString()}
];
const oneThreeTwo = [...oneThree, {address: hubAddress, wei: bigNumberify(2).toHexString()}];

const app10 = scenarios.appState({turnNum: 10, balances: oneThree, isFinal: true});
const app11 = scenarios.appState({turnNum: 11, balances: oneThree, isFinal: true});
const appChannel = channelFromStates([app10, app11], asAddress, asPrivateKey);
const appChannelId = appChannel.channelId;

const ledger6 = scenarios.ledgerState({turnNum: 6, balances: twoTwo});
const ledger7 = scenarios.ledgerState({turnNum: 7, balances: twoTwo});
const ledger8 = scenarios.ledgerState({
  turnNum: 8,
  balances: twoTwo,
  proposedBalances: oneThreeHub
});
const ledger9 = scenarios.ledgerState({
  turnNum: 9,
  balances: oneThreeHub
});

const ledgerChannelBeforeUpdate = channelFromStates([ledger6, ledger7], asAddress, asPrivateKey);

const ledgerChannelBeforeConsensus = channelFromStates([ledger7, ledger8], asAddress, asPrivateKey);

const ledgerId = ledgerChannelBeforeUpdate.channelId;
const fundingApp = [
  {address: ethers.Wallet.createRandom().address, wei: bigNumberify(6).toHexString()}
];

const joint4 = scenarios.threeWayLedgerState({turnNum: 4, balances: fundingApp});
const joint5 = scenarios.threeWayLedgerState({turnNum: 5, balances: fundingApp});
const joint6 = scenarios.threeWayLedgerState({
  turnNum: 6,
  balances: fundingApp,
  proposedBalances: oneThreeTwo,
  isVote: true
});
const joint7 = scenarios.threeWayLedgerState({
  turnNum: 7,
  balances: fundingApp,
  proposedBalances: oneThreeTwo
});
const joint8 = scenarios.threeWayLedgerState({turnNum: 8, balances: oneThreeTwo});
const jointChannelFundingApp = channelFromStates([joint4, joint5], asAddress, asPrivateKey);
const jointChannelBeforeConsensus = channelFromStates([joint6, joint7], asAddress, asPrivateKey);
const jointChannelId = jointChannelFundingApp.channelId;

const guarantorChannelId = "0x01";

const startingOutcome = app10.state.outcome;
const props = {
  targetChannelId: appChannelId,
  processId,
  startingOutcome,
  hubAddress,
  ourIndex: TwoPartyPlayerIndex.A,
  protocolLocator: [],
  ourAddress: asAddress,
  jointChannelId,
  ledgerChannelId: ledgerId
};

// ----
// States
// ------
const waitForJointChannelUpdate = states.waitForJointChannelUpdate({
  ...props,
  jointChannel: consensusStates.stateSent({
    processId,
    protocolLocator: makeLocator(EmbeddedProtocol.ConsensusUpdate),
    proposedOutcome: scenarios.convertBalanceToOutcome(oneThreeTwo),
    channelId: jointChannelId
  })
});
const waitForLedgerChannelUpdate = states.waitForLedgerChannelUpdate({
  ...props,
  ledgerChannel: consensusStates.stateSent({
    processId,
    protocolLocator: makeLocator(EmbeddedProtocol.ConsensusUpdate),
    proposedOutcome: scenarios.convertBalanceToOutcome(oneThreeHub),
    channelId: ledgerId
  })
});

// ----
// Shared Data
// ------

const createFundingState = sharedData => {
  sharedData = setFundingState(sharedData, appChannelId, {
    fundingChannel: jointChannelId,
    directlyFunded: false
  });
  sharedData = setFundingState(sharedData, jointChannelId, {
    guarantorChannel: guarantorChannelId,
    directlyFunded: false
  });
  sharedData = setFundingState(sharedData, guarantorChannelId, {
    fundingChannel: ledgerId,
    directlyFunded: false
  });
  sharedData = setFundingState(sharedData, ledgerId, {directlyFunded: true});
  return sharedData;
};

const initialSharedData = createFundingState(
  setChannel(setChannel(EMPTY_SHARED_DATA, jointChannelFundingApp), appChannel)
);

const waitForJointSharedData = createFundingState(
  setChannel(
    setChannel(
      setChannel(EMPTY_SHARED_DATA, jointChannelBeforeConsensus),
      ledgerChannelBeforeUpdate
    ),
    appChannel
  )
);

const waitForLedgerSharedData = createFundingState(
  setChannel(setChannel(EMPTY_SHARED_DATA, ledgerChannelBeforeConsensus), appChannel)
);
// ----
// Actions
// ------
const jointStateReceived = signedStatesReceived({
  processId,
  protocolLocator: makeLocator(EmbeddedProtocol.ConsensusUpdate),
  signedStates: [joint8]
});

const ledgerStateReceived = signedStatesReceived({
  processId,
  protocolLocator: makeLocator(EmbeddedProtocol.ConsensusUpdate),
  signedStates: [ledger9]
});

const paddedAsAddress = convertAddressToBytes32(asAddress);
const paddedBsAddress = convertAddressToBytes32(bsAddress);
const paddedHubAddress = convertAddressToBytes32(hubAddress);

export const happyPath = {
  ...props,
  initialize: {
    ...props,
    appData: encodeConsensusData({
      furtherVotesRequired: 2,
      proposedOutcome: [
        {
          assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
          allocationItems: [
            {destination: paddedAsAddress, amount: bigNumberify(1).toHexString()},
            {destination: paddedBsAddress, amount: bigNumberify(3).toHexString()},
            {destination: paddedHubAddress, amount: bigNumberify(4).toHexString()}
          ]
        }
      ]
    }),

    sharedData: initialSharedData
  },
  waitForJointChannel: {
    state: waitForJointChannelUpdate,
    action: jointStateReceived,
    sharedData: waitForJointSharedData,
    appData: encodeConsensusData({
      furtherVotesRequired: 1,
      proposedOutcome: [
        {
          assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
          allocationItems: [
            {destination: paddedAsAddress, amount: bigNumberify(1).toHexString()},
            {destination: paddedHubAddress, amount: bigNumberify(3).toHexString()}
          ]
        }
      ]
    })
  },
  waitForLedgerChannel: {
    state: waitForLedgerChannelUpdate,
    action: ledgerStateReceived,
    sharedData: waitForLedgerSharedData
  }
};
