import {right, left} from 'fp-ts/lib/Either';
import {none, some} from 'fp-ts/lib/Option';
import {SimpleAllocation} from '@statechannels/wallet-core';

import {match} from '../fp';

import {Protocol, ChannelState, stage, ProtocolResult} from './state';

export type DirectFundingState = ChannelState & {targetOutcome: SimpleAllocation};

type FundingStatus = 'Not Funded' | 'Funded';

const signState = (stage: 'PrefundSetup' | 'PostfundSetup') => async (
  state: DirectFundingState
): ProtocolResult =>
  right(
    some({
      type: 'SignState',
      channelId: state.channelId,
      turnNum: stage === 'PrefundSetup' ? 0 : 1,
      outcome: state.targetOutcome,
    })
  );

// TODO: This should probably be it's own protocol?
const handleFunding = async (): ProtocolResult => right(none);

const getFundingStatus = (): FundingStatus => 'Not Funded';

const noSupportedState = match(ps => stage(ps.latestSignedByMe), {
  Missing: signState('PrefundSetup'),
  PrefundSetup: () => Promise.resolve(right(none)), // Could probably log something out
  Default: () =>
    Promise.resolve(left(new Error(`You shouldn't of signed a state past the prefund setup!!`))),
});

const prefundSetupStateSupported = match(getFundingStatus, {
  Funded: signState('PostfundSetup'), // sign postFundSetup,
  'Not Funded': handleFunding,
});

// TODO: Implement this
const postFundSetupStateSupported = (): ProtocolResult => Promise.resolve(right(none));

export const protocol: Protocol<DirectFundingState> = match(ps => stage(ps.supported), {
  Missing: noSupportedState,
  PrefundSetup: prefundSetupStateSupported,
  PostfundSetup: postFundSetupStateSupported,
  Default: () => Promise.resolve(right(none)),
});
