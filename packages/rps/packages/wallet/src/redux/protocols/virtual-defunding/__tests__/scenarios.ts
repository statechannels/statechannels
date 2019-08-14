import { appCommitment } from '../../../../domain/commitments/__tests__';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import * as scenarios from '../../../../domain/commitments/__tests__';
import { PlayerIndex } from 'magmo-wallet-client/lib/wallet-instructions';
import * as states from '../states';
import { setChannel, EMPTY_SHARED_DATA, setFundingState } from '../../../state';
import _ from 'lodash';
import { bigNumberify } from 'ethers/utils/bignumber';
import { bsAddress } from '../../../../communication/__tests__/commitments';
import { commitmentsReceived, EmbeddedProtocol } from '../../../../communication';
import { makeLocator } from '../..';
import * as consensusStates from '../../consensus-update/states';
import { HUB_ADDRESS } from '../../../../constants';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator/lib/consensus-app';

// ---------
// Test data
// ---------
const processId = 'Process.123';

const { asAddress, asPrivateKey } = scenarios;
const hubAddress = HUB_ADDRESS;
const twoTwo = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: hubAddress, wei: bigNumberify(2).toHexString() },
];
const oneThree = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];
const oneThreeHub = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: hubAddress, wei: bigNumberify(3).toHexString() },
];
const oneThreeFour = [...oneThree, { address: hubAddress, wei: bigNumberify(4).toHexString() }];

const app10 = appCommitment({ turnNum: 10, balances: oneThree, isFinal: true });
const app11 = appCommitment({ turnNum: 11, balances: oneThree, isFinal: true });
const appChannel = channelFromCommitments([app10, app11], asAddress, asPrivateKey);
const appChannelId = appChannel.channelId;

const ledger6 = scenarios.ledgerCommitment({ turnNum: 6, balances: twoTwo });
const ledger7 = scenarios.ledgerCommitment({ turnNum: 7, balances: twoTwo });
const ledger8 = scenarios.ledgerCommitment({
  turnNum: 8,
  balances: twoTwo,
  proposedBalances: oneThreeHub,
});
const ledger9 = scenarios.ledgerCommitment({
  turnNum: 9,
  balances: oneThreeHub,
});

const ledgerChannelBeforeUpdate = channelFromCommitments(
  [ledger6, ledger7],
  asAddress,
  asPrivateKey,
);

const ledgerChannelBeforeConsensus = channelFromCommitments(
  [ledger7, ledger8],
  asAddress,
  asPrivateKey,
);

const ledgerId = ledgerChannelBeforeUpdate.channelId;
const fundingApp = [{ address: appChannelId, wei: bigNumberify(6).toHexString() }];

const joint4 = scenarios.threeWayLedgerCommitment({ turnNum: 4, balances: fundingApp });
const joint5 = scenarios.threeWayLedgerCommitment({ turnNum: 5, balances: fundingApp });
const joint6 = scenarios.threeWayLedgerCommitment({
  turnNum: 6,
  balances: fundingApp,
  proposedBalances: oneThreeFour,
  isVote: true,
});
const joint7 = scenarios.threeWayLedgerCommitment({
  turnNum: 7,
  balances: fundingApp,
  proposedBalances: oneThreeFour,
});
const joint8 = scenarios.threeWayLedgerCommitment({ turnNum: 8, balances: oneThreeFour });
const jointChannelFundingApp = channelFromCommitments([joint4, joint5], asAddress, asPrivateKey);
const jointChannelBeforeConsensus = channelFromCommitments(
  [joint6, joint7],
  asAddress,
  asPrivateKey,
);
const jointChannelId = jointChannelFundingApp.channelId;

const guarantorChannelId = '0x01';

const startingAllocation = app10.commitment.allocation;
const startingDestination = app10.commitment.destination;
const props = {
  targetChannelId: appChannelId,
  processId,
  startingAllocation,
  startingDestination,
  hubAddress,
  ourIndex: PlayerIndex.A,
  protocolLocator: [],
  ourAddress: asAddress,
  jointChannelId,
  ledgerChannelId: ledgerId,
};

// ----
// States
// ------
const waitForJointChannelUpdate = states.waitForJointChannelUpdate({
  ...props,
  jointChannel: consensusStates.commitmentSent({
    processId,
    protocolLocator: makeLocator(EmbeddedProtocol.ConsensusUpdate),
    proposedAllocation: oneThreeFour.map(i => i.wei),
    proposedDestination: oneThreeFour.map(i => i.address),
    channelId: jointChannelId,
  }),
});
const waitForLedgerChannelUpdate = states.waitForLedgerChannelUpdate({
  ...props,
  ledgerChannel: consensusStates.commitmentSent({
    processId,
    protocolLocator: makeLocator(EmbeddedProtocol.ConsensusUpdate),
    proposedAllocation: oneThreeHub.map(i => i.wei),
    proposedDestination: oneThreeHub.map(i => i.address),
    channelId: ledgerId,
  }),
});

// ----
// Shared Data
// ------

const createFundingState = sharedData => {
  sharedData = setFundingState(sharedData, appChannelId, {
    fundingChannel: jointChannelId,
    directlyFunded: false,
  });
  sharedData = setFundingState(sharedData, jointChannelId, {
    guarantorChannel: guarantorChannelId,
    directlyFunded: false,
  });
  sharedData = setFundingState(sharedData, guarantorChannelId, {
    fundingChannel: ledgerId,
    directlyFunded: false,
  });
  sharedData = setFundingState(sharedData, ledgerId, { directlyFunded: true });
  return sharedData;
};

const initialSharedData = createFundingState(
  setChannel(setChannel(EMPTY_SHARED_DATA, jointChannelFundingApp), appChannel),
);

const waitForJointSharedData = createFundingState(
  setChannel(
    setChannel(
      setChannel(EMPTY_SHARED_DATA, jointChannelBeforeConsensus),
      ledgerChannelBeforeUpdate,
    ),
    appChannel,
  ),
);

const waitForLedgerSharedData = createFundingState(
  setChannel(setChannel(EMPTY_SHARED_DATA, ledgerChannelBeforeConsensus), appChannel),
);
// ----
// Actions
// ------
const jointCommitmentReceived = commitmentsReceived({
  processId,
  protocolLocator: makeLocator(EmbeddedProtocol.ConsensusUpdate),
  signedCommitments: [joint8],
});

const ledgerCommitmentReceived = commitmentsReceived({
  processId,
  protocolLocator: makeLocator(EmbeddedProtocol.ConsensusUpdate),
  signedCommitments: [ledger9],
});

export const happyPath = {
  ...props,
  initialize: {
    ...props,
    appAttributes: bytesFromAppAttributes({
      proposedAllocation: [
        bigNumberify(1).toHexString(),
        bigNumberify(3).toHexString(),
        bigNumberify(4).toHexString(),
      ],
      proposedDestination: [asAddress, bsAddress, HUB_ADDRESS],
      furtherVotesRequired: 2,
    }),
    sharedData: initialSharedData,
  },
  waitForJointChannel: {
    state: waitForJointChannelUpdate,
    action: jointCommitmentReceived,
    sharedData: waitForJointSharedData,
    appAttributes: bytesFromAppAttributes({
      proposedAllocation: [bigNumberify(1).toHexString(), bigNumberify(3).toHexString()],
      proposedDestination: [asAddress, HUB_ADDRESS],
      furtherVotesRequired: 1,
    }),
  },
  waitForLedgerChannel: {
    state: waitForLedgerChannelUpdate,
    action: ledgerCommitmentReceived,
    sharedData: waitForLedgerSharedData,
  },
};
