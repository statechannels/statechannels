import {bigNumberify} from "ethers/utils";

import _ from "lodash";

import * as states from "../states";
import * as testScenarios from "../../../__tests__/state-helpers";
import {setFundingState, setChannels} from "../../../state";
import * as ledgerDefunding from "../../ledger-defunding/__tests__";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import * as virtualDefunding from "../../virtual-defunding/__tests__";

import {prependToLocator, makeLocator, EMPTY_LOCATOR} from "../..";
import {EmbeddedProtocol} from "../../../../communication";
import {mergeSharedData} from "../../../__tests__/helpers";
const processId = "process-id.123";

const {asAddress, bsAddress, asPrivateKey, channelId} = testScenarios;

const twoThree = [
  {address: asAddress, wei: bigNumberify(2).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()}
];

const concludeState1 = testScenarios.appState({turnNum: 51, isFinal: true});
const concludeState2 = testScenarios.appState({turnNum: 52, isFinal: true});
const ledger4 = testScenarios.ledgerState({turnNum: 4, balances: twoThree});
const ledger5 = testScenarios.ledgerState({turnNum: 5, balances: twoThree});

const channelStatus = channelFromStates([concludeState1, concludeState2], asAddress, asPrivateKey);

const ledgerChannelStatus = channelFromStates([ledger4, ledger5], asAddress, asPrivateKey);
const {ledgerId} = testScenarios;

const waitForLedgerDefunding = states.waitForLedgerDefunding({
  processId,
  channelId,
  ledgerId,
  protocolLocator: EMPTY_LOCATOR,
  ledgerDefundingState: prependToLocator(
    ledgerDefunding.preSuccessState.state,
    EmbeddedProtocol.LedgerDefunding
  )
});

const waitForVirtualDefunding = states.waitForVirtualDefunding({
  processId,
  channelId,
  ledgerId,
  protocolLocator: EMPTY_LOCATOR,
  virtualDefunding: prependToLocator(
    virtualDefunding.preSuccess.state,
    makeLocator(EmbeddedProtocol.VirtualDefunding)
  )
});

export const indirectlyFundingChannelHappyPath = {
  initialize: {
    processId,
    channelId,
    protocolLocator: EMPTY_LOCATOR,
    sharedData: setChannels(
      setFundingState(
        setFundingState(ledgerDefunding.initialStore, channelId, {
          directlyFunded: false,
          fundingChannel: testScenarios.ledgerId
        }),
        testScenarios.ledgerId,
        {directlyFunded: true}
      ),
      [channelStatus]
    )
  },
  // States
  waitForLedgerDefunding: {
    state: waitForLedgerDefunding,
    action: prependToLocator(ledgerDefunding.successTrigger, EmbeddedProtocol.LedgerDefunding),
    sharedData: setChannels(
      setFundingState(
        setFundingState(ledgerDefunding.preSuccessState.sharedData, channelId, {
          directlyFunded: false,
          fundingChannel: testScenarios.ledgerId
        }),
        testScenarios.ledgerId,
        {directlyFunded: true}
      ),
      [channelStatus, ledgerChannelStatus]
    )
  }
};

export const virtualFundingChannelHappyPath = {
  initialize: {
    processId,
    protocolLocator: EMPTY_LOCATOR,
    channelId: virtualDefunding.initial.targetChannelId,
    sharedData: mergeSharedData(
      virtualDefunding.preSuccess.sharedData,
      ledgerDefunding.preSuccessState.sharedData
    )
  },
  // States
  waitForVirtualDefunding: {
    state: waitForVirtualDefunding,
    action: prependToLocator(virtualDefunding.preSuccess.action, EmbeddedProtocol.VirtualDefunding),
    sharedData: virtualDefunding.preSuccess.sharedData
  }
};
