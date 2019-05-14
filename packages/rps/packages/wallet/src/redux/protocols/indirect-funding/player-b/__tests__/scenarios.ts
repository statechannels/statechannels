import { bigNumberify } from 'ethers/utils';
import * as globalActions from '../../../../actions';
import {
  bWaitForPreFundSetup0,
  bWaitForDirectFunding,
  bWaitForLedgerUpdate0,
  bWaitForPostFundSetup0,
} from '../state';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';
import { EMPTY_SHARED_DATA, setChannels } from '../../../../state';

import {
  preSuccessStateB,
  successTriggerB,
  preFailureState,
  failureTrigger,
} from '../../../direct-funding/__tests__';
import {
  appCommitment,
  ledgerCommitment,
  asAddress,
  bsAddress,
  bsPrivateKey,
  ledgerId,
  channelId,
} from '../../../../../domain/commitments/__tests__';
import { success } from '../../../indirect-defunding/state';

// -----------
// Commitments
// -----------
const processId = 'processId';

const twoThree = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

const fiveToApp = [{ address: channelId, wei: bigNumberify(5).toHexString() }];

const app0 = appCommitment({ turnNum: 0, balances: twoThree });
const app1 = appCommitment({ turnNum: 1, balances: twoThree });
const app2 = appCommitment({ turnNum: 2, balances: twoThree });
const app3 = appCommitment({ turnNum: 3, balances: twoThree });

// todo use imported helper functions instead of this one

const ledger0 = ledgerCommitment({ turnNum: 0, balances: twoThree }); // Ledger PreFundSetup
const ledger1 = ledgerCommitment({ turnNum: 1, balances: twoThree }); // Ledger PreFundSetup
const ledger2 = ledgerCommitment({ turnNum: 2, balances: twoThree }); // Ledger PostFundSetup
const ledger3 = ledgerCommitment({ turnNum: 3, balances: twoThree }); // Ledger PostFundSetup
const ledger4 = ledgerCommitment({
  turnNum: 4,
  balances: twoThree,
  proposedBalances: fiveToApp,
}); // Ledger App/Proposal
const ledger5 = ledgerCommitment({ turnNum: 5, balances: fiveToApp }); // Ledger App/Consensus

// Channels

const props = { channelId, ledgerId, processId };

// ------
// States
// ------
const waitForPreFundSetup0 = {
  state: bWaitForPreFundSetup0(props),
  store: setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(app0, app1, bsAddress, bsPrivateKey),
  ]),
};
const waitForDirectFunding = {
  state: bWaitForDirectFunding({ ...props, directFundingState: preSuccessStateB.protocolState }), //
  store: setChannels(preSuccessStateB.sharedData, [
    channelFromCommitments(app0, app1, bsAddress, bsPrivateKey),
    channelFromCommitments(ledger0, ledger1, bsAddress, bsPrivateKey),
  ]),
};
const waitForLedgerUpdate0 = {
  state: bWaitForLedgerUpdate0(props),
  store: setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(app0, app1, bsAddress, bsPrivateKey),
    channelFromCommitments(ledger2, ledger3, bsAddress, bsPrivateKey),
  ]),
};
const waitForPostFund0 = {
  state: bWaitForPostFundSetup0(props),
  store: setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(app0, app1, bsAddress, bsPrivateKey),
    channelFromCommitments(ledger4, ledger5, bsAddress, bsPrivateKey),
  ]),
};

const waitForDirectFundingFailure = {
  state: bWaitForDirectFunding({ ...props, directFundingState: preFailureState.protocolState }), //
  store: setChannels(preFailureState.sharedData, [
    channelFromCommitments(app0, app1, bsAddress, bsPrivateKey),
    channelFromCommitments(ledger0, ledger1, bsAddress, bsPrivateKey),
  ]),
};

const successState = {
  state: success(),
  store: setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(app2, app3, asAddress, bsPrivateKey),
    channelFromCommitments(ledger4, ledger5, asAddress, bsPrivateKey),
  ]),
};

// -------
// Actions
// -------
const preFundSetup0Received = globalActions.commitmentReceived(processId, ledger0);
const ledgerUpdate0Received = globalActions.commitmentReceived(processId, ledger4);
const postFund0Received = globalActions.commitmentReceived(processId, app2);

export const happyPath = {
  initialParams: { store: waitForPreFundSetup0.store, channelId, processId: 'processId', ledgerId },
  waitForPreFundSetup0: {
    state: waitForPreFundSetup0,
    action: preFundSetup0Received,
    reply: ledger1,
  },
  waitForDirectFunding: { state: waitForDirectFunding, action: successTriggerB },
  waitForLedgerUpdate0: {
    state: waitForLedgerUpdate0,
    action: ledgerUpdate0Received,
    reply: ledger5,
  },
  waitForPostFund0: { state: waitForPostFund0, action: postFund0Received, reply: app3 },
  success: { state: successState },
};

export const ledgerFundingFails = {
  waitForDirectFunding: { state: waitForDirectFundingFailure, action: failureTrigger },
};
