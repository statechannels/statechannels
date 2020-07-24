import {right, left} from 'fp-ts/lib/Either';
import {none, some} from 'fp-ts/lib/Option';
import {BN, isSimpleAllocation, checkThat} from '@statechannels/wallet-core';

import {match} from '../match';

import {Protocol, stage, ProtocolResult, ChannelState} from './state';

type FundingStatus = 'Funded' | 'Not Funded';
export type ProtocolState = {app: ChannelState};
const signPostFundSetup = (ps: ProtocolState): ProtocolResult => {
  if (!ps.app.latestSignedByMe) {
    throw new Error('Expected a signed state by me');
  }
  return right(
    some({
      type: 'SignState',
      channelId: ps.app.channelId,
      ...ps.app.latestSignedByMe,
      turnNum: 3,
    })
  );
};

const getFundingStatus = (ps: ProtocolState): FundingStatus => {
  if (!ps.app.supported) {
    return 'Not Funded';
  }
  const allocation = checkThat(ps.app.supported?.outcome, isSimpleAllocation);

  const currentFunding = ps.app.funding[allocation.assetHolderAddress] || '0x0';
  const targetFunding = allocation.allocationItems.map(a => a.amount).reduce(BN.add);
  return BN.gte(currentFunding, targetFunding) ? 'Funded' : 'Not Funded';
};

const alreadyFunded = match(ps => stage(ps.app.latestSignedByMe), {
  Missing: () => left(new Error(`Missing prefund setup`)),
  PrefundSetup: signPostFundSetup,
  PostfundSetup: () => right(none), // Postfund setup is already signed
  Default: () => left(new Error(`State signed too early`)),
});

const prefundSetupStateSupported = match(getFundingStatus, {
  Funded: alreadyFunded,
  'Not Funded': () => right(none), // TODO: Start depositing
});

const prefundSetupSigned = match(ps => stage(ps.app.supported), {
  PrefundSetup: prefundSetupStateSupported,
  Default: () => right(none), // Still waiting for the opponent to sign
});

export const protocol: Protocol<ProtocolState> = match(ps => stage(ps.app.latestSignedByMe), {
  Missing: () => left(new Error(`The direct funding protocol requires a signed prefund setup`)),
  PrefundSetup: prefundSetupSigned,
  Default: () => right(none),
});
