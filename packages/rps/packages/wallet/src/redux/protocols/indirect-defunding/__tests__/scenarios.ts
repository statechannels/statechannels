import {
  appCommitment,
  ledgerCommitment,
  asAddress,
  bsAddress,
  asPrivateKey,
  ledgerId,
  channelId,
} from '../../../../domain/commitments/__tests__';
import { bigNumberify } from 'ethers/utils/bignumber';
import { waitForLedgerUpdate } from '../state';
import { setChannels, EMPTY_SHARED_DATA } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { bsPrivateKey } from '../../../../communication/__tests__/commitments';
import * as globalActions from '../../../actions';

const processId = 'processId';

const twoThree = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

const fiveToApp = [{ address: channelId, wei: bigNumberify(5).toHexString() }];

const props = {
  channelId,
  ledgerId,
  processId,
  proposedAllocation: twoThree.map(a => a.wei),
  proposedDestination: twoThree.map(a => a.address),
};

// -----------
// Commitments
// -----------

const app9 = appCommitment({ turnNum: 9, balances: twoThree, isFinal: false });
const app10 = appCommitment({ turnNum: 10, balances: twoThree, isFinal: true });
const app11 = appCommitment({ turnNum: 11, balances: twoThree, isFinal: true });

const ledger4 = ledgerCommitment({ turnNum: 4, balances: twoThree, proposedBalances: fiveToApp });
const ledger5 = ledgerCommitment({ turnNum: 5, balances: fiveToApp });
const ledger6 = ledgerCommitment({ turnNum: 6, balances: fiveToApp, proposedBalances: twoThree });
const ledger7 = ledgerCommitment({ turnNum: 7, balances: twoThree });

// -----------
// States
// -----------
const initialStore = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(app10, app11, asAddress, asPrivateKey),
  channelFromCommitments(ledger4, ledger5, asAddress, asPrivateKey),
]);

const notDefundableInitialStore = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(app9, app10, asAddress, asPrivateKey),
  channelFromCommitments(ledger4, ledger5, asAddress, asPrivateKey),
]);

const playerAWaitForUpdate = {
  state: waitForLedgerUpdate(props),
  store: setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(app10, app11, asAddress, asPrivateKey),
    channelFromCommitments(ledger5, ledger6, asAddress, asPrivateKey),
  ]),
};

const playerBWaitForUpdate = {
  state: waitForLedgerUpdate(props),
  store: setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(app10, app11, bsAddress, bsPrivateKey),
    channelFromCommitments(ledger4, ledger5, bsAddress, bsPrivateKey),
  ]),
};

// -----------
// Actions
// -----------
const ledgerUpdate0Received = globalActions.commitmentReceived(processId, ledger6);
const ledgerUpdate1Received = globalActions.commitmentReceived(processId, ledger7);
const invalidLedgerUpdateReceived = globalActions.commitmentReceived(processId, ledger5);
// -----------
// Scenarios
// -----------
export const playerAHappyPath = {
  initialParams: {
    store: initialStore,
    ...props,
    reply: ledger6,
  },
  waitForLedgerUpdate: { state: playerAWaitForUpdate, action: ledgerUpdate1Received },
};

export const playerAInvalidCommitment = {
  waitForLedgerUpdate: { state: playerAWaitForUpdate, action: invalidLedgerUpdateReceived },
};
export const playerBInvalidCommitment = {
  waitForLedgerUpdate: { state: playerBWaitForUpdate, action: invalidLedgerUpdateReceived },
};

export const playerBHappyPath = {
  initialParams: {
    store: initialStore,
    ...props,
  },
  waitForLedgerUpdate: {
    state: playerBWaitForUpdate,
    action: ledgerUpdate0Received,
    reply: ledger7,
  },
};

export const notDefundable = {
  initialParams: {
    store: notDefundableInitialStore,
    ...props,
  },
};
