import * as scenarios from './test-scenarios';
import * as states from '../state';
import * as channelStates from '../channelState/state';
import * as fundingStates from '../fundingState/state';
import * as actions from '../actions';
import { addHex } from '../../utils/hex-utils';
import { walletReducer } from '../reducer';

const {
  asAddress,
  asPrivateKey,
  channelNonce,
  libraryAddress,
  participants,
  preFundCommitment1,
  preFundCommitment2,
  channelId,
  twoThree,
} = scenarios;

const defaults = {
  address: asAddress,
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  networkId: 3,
  participants,
  uid: 'uid',
  transactionHash: '0x0',
  funded: false,
};
const channelDefaults = {
  ...defaults,
  ourIndex: 0,
  privateKey: asPrivateKey,
};

const YOUR_DEPOSIT_A = twoThree[0];
const TOTAL_REQUIRED = twoThree.reduce(addHex);
const fundingDefaults: fundingStates.DirectFundingStatus = {
  fundingType: fundingStates.DIRECT_FUNDING,
  requestedTotalFunds: TOTAL_REQUIRED,
  requestedYourContribution: YOUR_DEPOSIT_A,
  channelId,
  ourIndex: 0,
  safeToDepositLevel: '0x',
  channelFundingStatus: fundingStates.NOT_SAFE_TO_DEPOSIT,
};

const MOCK_SIGNATURE = 'signature';
const justReceivedPreFundSetupB = {
  penultimateCommitment: { commitment: preFundCommitment1, signature: MOCK_SIGNATURE },
  lastCommitment: { commitment: preFundCommitment2, signature: MOCK_SIGNATURE },
  turnNum: 1,
};

describe('when a fundingReceivedEvent caused a channel to be funded', () => {
  it.skip('updates the corresponding channel state', () => {
    const channelState: channelStates.ChannelState = {
      initializingChannels: {},
      initializedChannels: {
        [channelId]: channelStates.waitForFundingAndPostFundSetup({
          ...channelDefaults,
          ...justReceivedPreFundSetupB,
        }),
      },
    };

    const fundingState: fundingStates.FundingState = {
      ...fundingStates.EMPTY_FUNDING_STATE,
      directFunding: {
        [channelId]: fundingStates.notSafeToDeposit(fundingDefaults),
      },
    };

    const state = states.initialized({
      ...states.emptyState,
      ...defaults,
      channelState,
      fundingState,
    });

    const action = actions.funding.fundingReceivedEvent(channelId, TOTAL_REQUIRED, TOTAL_REQUIRED);
    const updatedState = walletReducer(state, action);
    const updatedChannel = states.getChannelStatus(updatedState, channelId);
    expect(updatedChannel.type).toEqual(channelStates.A_WAIT_FOR_POST_FUND_SETUP);
  });
});
