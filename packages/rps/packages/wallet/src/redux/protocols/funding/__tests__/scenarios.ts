import * as states from '../states';
import * as actions from '../actions';

import { EMPTY_SHARED_DATA, setChannels } from '../../../state';
import {
  channelId,
  bsAddress,
  asAddress,
  appCommitment,
  asPrivateKey,
} from '../../../../domain/commitments/__tests__';
import { preSuccess as indirectFundingPreSuccess } from '../../indirect-funding/__tests__';
import { preSuccess as virtualFundingPreSuccess } from '../../virtual-funding/__tests__';
import { preSuccess as advanceChannelPreSuccess } from '../../advance-channel/__tests__';
import { bigNumberify } from 'ethers/utils';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { prependToLocator } from '../..';
import { EmbeddedProtocol } from '../../../../communication';
import {
  indirectPreSuccess as indirectNegotiationPreSuccess,
  virtualPreSuccess as virtualNegotiationPreSuccess,
} from '../../funding-strategy-negotiation/player-a/__tests__';
// ---------
// Test data
// ---------
const processId = 'process-id.123';
const targetChannelId = channelId;
const opponentAddress = bsAddress;
const ourAddress = asAddress;

const props = {
  processId,
  targetChannelId,
  opponentAddress,
  ourAddress,
};
const oneThree = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];
const app0 = appCommitment({ turnNum: 0, balances: oneThree });
const app1 = appCommitment({ turnNum: 1, balances: oneThree });
const app2 = appCommitment({ turnNum: 2, balances: oneThree });
const app3 = appCommitment({ turnNum: 3, balances: oneThree });
const appChannelWaitingForFunding = channelFromCommitments([app0, app1], asAddress, asPrivateKey);
const successSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app2, app3], asAddress, asPrivateKey),
]);
// ----
// States
// ------

const waitForIndirectStrategyNegotiation = states.waitForStrategyNegotiation({
  ...props,
  fundingStrategyNegotiationState: indirectNegotiationPreSuccess.state,
});
const waitForVirtualStrategyNegotiation = states.waitForStrategyNegotiation({
  ...props,
  fundingStrategyNegotiationState: virtualNegotiationPreSuccess.state,
});
const waitForIndirectFunding = states.waitForIndirectFunding({
  ...props,
  fundingState: indirectFundingPreSuccess.state,
  postFundSetupState: advanceChannelPreSuccess.state,
});
const waitForVirtualFunding = states.waitForVirtualFunding({
  ...props,
  fundingState: virtualFundingPreSuccess.state,
  postFundSetupState: advanceChannelPreSuccess.state,
});
const waitForPostFundSetup = states.waitForPostFundSetup({
  ...props,
  postFundSetupState: advanceChannelPreSuccess.state,
});
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);

// -------
// Actions
// -------

const successConfirmed = actions.fundingSuccessAcknowledged({ processId });
const indirectFundingSuccess = prependToLocator(
  indirectFundingPreSuccess.action,
  EmbeddedProtocol.IndirectFunding,
);

// ---------
// Scenarios
// ---------
export const indirectFunding = {
  ...props,

  waitForStrategyNegotiation: {
    state: waitForIndirectStrategyNegotiation,
    sharedData: setChannels(indirectFundingPreSuccess.sharedData, [appChannelWaitingForFunding]),
    action: indirectNegotiationPreSuccess.action,
  },
  waitForIndirectFunding: {
    state: waitForIndirectFunding,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: indirectFundingSuccess,
  },
  waitForPostFundSetup: {
    state: waitForPostFundSetup,
    sharedData: advanceChannelPreSuccess.sharedData,
    action: advanceChannelPreSuccess.trigger,
  },
  waitForSuccessConfirmation: {
    state: waitForSuccessConfirmation,
    sharedData: successSharedData,
    action: successConfirmed,
  },
};

export const virtualFunding = {
  ...props,
  waitForStrategyNegotiation: {
    state: waitForVirtualStrategyNegotiation,
    sharedData: setChannels(virtualFundingPreSuccess.sharedData, [
      channelFromCommitments([app2, app3], asAddress, asPrivateKey),
    ]),
    action: virtualNegotiationPreSuccess.action,
  },

  waitForVirtualFunding: {
    state: waitForVirtualFunding,
    sharedData: setChannels(virtualFundingPreSuccess.sharedData, [
      channelFromCommitments([app2, app3], asAddress, asPrivateKey),
    ]),
    action: virtualFundingPreSuccess.action,
  },
};
