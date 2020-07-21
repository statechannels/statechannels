import {right, left} from 'fp-ts/lib/Either';
import {none, some} from 'fp-ts/lib/Option';

import {match} from '../fp';

import {Protocol, ChannelState, stage, ProtocolResult} from './state';
import {SignState} from './actions';

type FundingStatus = 'Not Funded' | 'Funded';

// TODO: This is just a dummy action for now
const signState: SignState = {type: 'SignState', channelId: '0', hash: '0'};
// TODO: This should probably be it's own protocol?
const handleFunding = async (): ProtocolResult => right(none);

const getFundingStatus = (): FundingStatus => 'Not Funded';

const noSupportedState = match(ps => stage(ps.latestSignedByMe), {
  Missing: async () => right(some(signState)),
  PrefundSetup: () => Promise.resolve(right(none)), // Could probably log something out
  Default: () =>
    Promise.resolve(left(new Error(`You shouldn't of signed a state past the prefund setup!!`))),
});

const prefundSetupStateSupported = match(getFundingStatus, {
  Funded: () => Promise.resolve(right(some(signState))), // sign postFundSetup,
  'Not Funded': handleFunding,
});

// TODO: Implement this
const postFundSetupStateSupported = (): ProtocolResult => Promise.resolve(right(none));

export const protocol: Protocol<ChannelState> = match(ps => stage(ps.supported), {
  Missing: noSupportedState,
  PrefundSetup: prefundSetupStateSupported,
  PostfundSetup: postFundSetupStateSupported,
  Default: () => Promise.resolve(right(none)),
});
