import {BN, isSimpleAllocation, checkThat} from '@statechannels/wallet-core';

import {match} from '../match';

import {Protocol, stage, ProtocolResult, ChannelState} from './state';
import {noAction, error, signState} from './actions';

type FundingStatus = 'Funded' | 'Not Funded';
export type ProtocolState = {app: ChannelState};
const signPostFundSetup = (ps: ProtocolState): ProtocolResult => {
  if (!ps.app.latestSignedByMe) {
    return error('Expected a signed state by me');
  }
  return signState({
    channelId: ps.app.channelId,
    ...ps.app.latestSignedByMe,
    turnNum: 3,
  });
};

const getFundingStatus = (ps: ProtocolState): FundingStatus => {
  if (!ps.app.supported) {
    return 'Not Funded';
  }
  const allocation = checkThat(ps.app.supported?.outcome, isSimpleAllocation);

  const currentFunding = ps.app.funding(allocation.assetHolderAddress);
  const targetFunding = allocation.allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));
  return BN.gte(currentFunding, targetFunding) ? 'Funded' : 'Not Funded';
};

const alreadyFunded = match(ps => stage(ps.app.latestSignedByMe), {
  Missing: () => error(`Missing prefund setup`),
  PrefundSetup: signPostFundSetup,
  PostfundSetup: () => noAction, // Postfund setup is already signed
  Default: () => error(`State signed too early`),
});

const prefundSetupStateSupported = match(getFundingStatus, {
  Funded: alreadyFunded,
  'Not Funded': () => noAction, // TODO: Start depositing
});

const prefundSetupSigned = match(ps => stage(ps.app.supported), {
  PrefundSetup: prefundSetupStateSupported,
  Default: () => noAction, // Still waiting for the opponent to sign
});

export const protocol: Protocol<ProtocolState> = match(ps => stage(ps.app.latestSignedByMe), {
  Missing: () => error(`The application protocol requires a signed prefund setup`),
  PrefundSetup: prefundSetupSigned,
  Default: () => noAction,
});
