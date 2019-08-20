import * as states from '../states';
import * as withdrawalScenarios from '../../withdrawing/__tests__/scenarios';
import * as testScenarios from '../../../../domain/commitments/__tests__';
import _ from 'lodash';
import { prependToLocator } from '../..';
import { EmbeddedProtocol } from '../../../../communication';
import * as advanceChannelScenarios from '../../advance-channel/__tests__';
import { bigNumberify } from 'ethers/utils';
import { EMPTY_SHARED_DATA, setChannels } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { mergeSharedData } from '../../../__tests__/helpers';
const processId = 'process-id.123';

const { ledgerId: channelId, channelId: appChannelId } = testScenarios;
const twoThree = [
  { address: testScenarios.asAddress, wei: bigNumberify(2).toHexString() },
  { address: testScenarios.bsAddress, wei: bigNumberify(3).toHexString() },
];
const fundingAppChannel = [{ address: appChannelId, wei: bigNumberify(5).toHexString() }];

const ledger4 = testScenarios.ledgerCommitment({ turnNum: 4, balances: twoThree });
const ledger5 = testScenarios.ledgerCommitment({ turnNum: 5, balances: twoThree });
const ledger6 = testScenarios.ledgerCommitment({ turnNum: 6, balances: twoThree, isFinal: true });
const ledger7 = testScenarios.ledgerCommitment({ turnNum: 7, balances: twoThree, isFinal: true });

const ledgerFundingChannel0 = testScenarios.ledgerCommitment({
  turnNum: 4,
  balances: fundingAppChannel,
});
const ledgerFundingChannel1 = testScenarios.ledgerCommitment({
  turnNum: 5,
  balances: fundingAppChannel,
});

const app5 = testScenarios.appCommitment({ turnNum: 5, balances: twoThree });
const app6 = testScenarios.appCommitment({ turnNum: 6, balances: twoThree });

const ledgerOpenSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger4, ledger5], testScenarios.asAddress, testScenarios.asPrivateKey),
]);
const ledgerConcludedSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger6, ledger7], testScenarios.asAddress, testScenarios.asPrivateKey),
]);
const ledgerFundingSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    [ledgerFundingChannel0, ledgerFundingChannel1],
    testScenarios.asAddress,
    testScenarios.asPrivateKey,
  ),
  channelFromCommitments([app5, app6], testScenarios.asAddress, testScenarios.asPrivateKey),
]);

const waitForWithdrawal = states.waitForWithdrawal({
  processId,
  channelId,
  withdrawal: withdrawalScenarios.happyPath.waitForAcknowledgement.state,
});

const waitForConclude = states.waitForConclude({
  processId,
  channelId,
  concluding: prependToLocator(
    advanceChannelScenarios.conclude.preSuccess.state,
    EmbeddedProtocol.AdvanceChannel,
  ),
});

export const happyPath = {
  initialize: {
    processId,
    channelId: testScenarios.ledgerId,
    sharedData: ledgerOpenSharedData,
  },
  // States
  waitForConclude: {
    state: waitForConclude,
    action: prependToLocator(
      advanceChannelScenarios.conclude.preSuccess.trigger,
      EmbeddedProtocol.AdvanceChannel,
    ),
    sharedData: mergeSharedData(
      advanceChannelScenarios.conclude.preSuccess.sharedData,
      ledgerOpenSharedData,
    ),
  },

  waitForWithdrawal: {
    state: waitForWithdrawal,
    action: withdrawalScenarios.happyPath.waitForAcknowledgement.action,
    sharedData: withdrawalScenarios.happyPath.sharedData,
  },
};

export const alreadyConcluded = {
  initialize: {
    processId,
    channelId: testScenarios.ledgerId,
    sharedData: ledgerConcludedSharedData,
  },
  // States

  waitForWithdrawal: {
    state: waitForWithdrawal,
    action: withdrawalScenarios.happyPath.waitForAcknowledgement.action,
    sharedData: withdrawalScenarios.happyPath.sharedData,
  },
};

export const channelInUseFailure = {
  initialize: {
    processId,
    channelId: testScenarios.ledgerId,
    sharedData: ledgerFundingSharedData,
  },
};
