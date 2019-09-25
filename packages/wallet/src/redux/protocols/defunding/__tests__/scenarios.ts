import * as states from '../states';
import * as testScenarios from '../../../../domain/commitments/__tests__';
import { setFundingState, setChannels } from '../../../state';
import * as ledgerDefunding from '../../ledger-defunding/__tests__';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { bigNumberify } from 'ethers/utils';
import * as virtualDefunding from '../../virtual-defunding/__tests__';
import _ from 'lodash';
import { prependToLocator, makeLocator, EMPTY_LOCATOR } from '../..';
import { EmbeddedProtocol } from '../../../../communication';
import { mergeSharedData } from '../../../__tests__/helpers';
const processId = 'process-id.123';

const { asAddress, bsAddress, asPrivateKey, channelId } = testScenarios;

const twoThree = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

const concludeCommitment1 = testScenarios.appCommitment({ turnNum: 51, isFinal: true });
const concludeCommitment2 = testScenarios.appCommitment({ turnNum: 52, isFinal: true });
const ledger4 = testScenarios.ledgerCommitment({ turnNum: 4, balances: twoThree });
const ledger5 = testScenarios.ledgerCommitment({ turnNum: 5, balances: twoThree });

const channelStatus = channelFromCommitments(
  [concludeCommitment1, concludeCommitment2],
  asAddress,
  asPrivateKey,
);

const ledgerChannelStatus = channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey);
const { ledgerId } = testScenarios;

const waitForLedgerDefunding = states.waitForLedgerDefunding({
  processId,
  channelId,
  ledgerId,
  protocolLocator: EMPTY_LOCATOR,
  ledgerDefundingState: prependToLocator(
    ledgerDefunding.preSuccessState.state,
    EmbeddedProtocol.LedgerDefunding,
  ),
});

const waitForVirtualDefunding = states.waitForVirtualDefunding({
  processId,
  channelId,
  ledgerId,
  protocolLocator: EMPTY_LOCATOR,
  virtualDefunding: prependToLocator(
    virtualDefunding.preSuccess.state,
    makeLocator(EmbeddedProtocol.VirtualDefunding),
  ),
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
          fundingChannel: testScenarios.ledgerId,
        }),
        testScenarios.ledgerId,
        { directlyFunded: true },
      ),
      [channelStatus],
    ),
  },
  // States
  waitForLedgerDefunding: {
    state: waitForLedgerDefunding,
    action: prependToLocator(ledgerDefunding.successTrigger, EmbeddedProtocol.LedgerDefunding),
    sharedData: setChannels(
      setFundingState(
        setFundingState(ledgerDefunding.preSuccessState.sharedData, channelId, {
          directlyFunded: false,
          fundingChannel: testScenarios.ledgerId,
        }),
        testScenarios.ledgerId,
        { directlyFunded: true },
      ),
      [channelStatus, ledgerChannelStatus],
    ),
  },
};

export const virtualFundingChannelHappyPath = {
  initialize: {
    processId,
    protocolLocator: EMPTY_LOCATOR,
    channelId: virtualDefunding.initial.targetChannelId,
    sharedData: mergeSharedData(
      virtualDefunding.preSuccess.sharedData,
      ledgerDefunding.preSuccessState.sharedData,
    ),
  },
  // States
  waitForVirtualDefunding: {
    state: waitForVirtualDefunding,
    action: prependToLocator(virtualDefunding.preSuccess.action, EmbeddedProtocol.VirtualDefunding),
    sharedData: virtualDefunding.preSuccess.sharedData,
  },
};
