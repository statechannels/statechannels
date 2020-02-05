import {bigNumberify} from "ethers/utils";

import {
  asAddress,
  bsAddress,
  asPrivateKey,
  ledgerId,
  channelId,
  ledgerState,
  appState,
  convertBalanceToOutcome
} from "../../../__tests__/state-helpers";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import {EMPTY_SHARED_DATA, setChannels} from "../../../state";
import * as states from "../states";
import {preSuccess as existingLedgerPreSuccess} from "../../existing-ledger-funding/__tests__";
import {
  preSuccessState as newLedgerPreSuccess,
  successTrigger as NewLedgerChannelSuccessTrigger,
  successState as newLedgerSuccess
} from "../../new-ledger-channel/__tests__";
import {LEDGER_FUNDING_PROTOCOL_LOCATOR} from "../reducer";

const processId = "processId";

const oneThree = [
  {address: asAddress, wei: bigNumberify(1).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()}
];
const props = {
  ledgerId,
  channelId,
  processId,
  startingOutcome: convertBalanceToOutcome(oneThree),
  protocolLocator: LEDGER_FUNDING_PROTOCOL_LOCATOR
};
const ledger4 = ledgerState({turnNum: 4, balances: oneThree});
const ledger5 = ledgerState({turnNum: 5, balances: oneThree});
const app0 = appState({turnNum: 0, balances: oneThree});
const app1 = appState({turnNum: 1, balances: oneThree});
const existingLedgerFundingSharedData = setChannels(newLedgerSuccess.store, [
  channelFromStates([ledger4, ledger5], asAddress, asPrivateKey),
  channelFromStates([app0, app1], asAddress, asPrivateKey)
]);
const newLedgerChannelSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromStates([app0, app1], asAddress, asPrivateKey)
]);
const waitForExistingLedgerFunding = states.waitForExistingLedgerFunding({
  ...props,
  existingLedgerFundingState: existingLedgerPreSuccess.state
});
const waitForNewLedgerChannel = states.waitForNewLedgerChannel({
  ...props,
  newLedgerChannel: newLedgerPreSuccess.state
});

export const existingLedgerFundingHappyPath = {
  initialize: {
    ...props,
    participants: oneThree.map(o => o.address),
    sharedData: existingLedgerFundingSharedData
  }
};

export const newLedgerChannelHappyPath = {
  initialize: {
    ...props,
    participants: oneThree.map(o => o.address),
    sharedData: newLedgerChannelSharedData
  },
  waitForNewLedgerChannel: {
    state: waitForNewLedgerChannel,
    action: NewLedgerChannelSuccessTrigger,
    sharedData: newLedgerPreSuccess.sharedData
  },
  waitForExistingLedgerFunding: {
    state: waitForExistingLedgerFunding,
    action: existingLedgerPreSuccess.action,
    sharedData: existingLedgerPreSuccess.sharedData
  }
};
