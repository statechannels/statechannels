import {right, left} from 'fp-ts/lib/Either';
import {none, some} from 'fp-ts/lib/Option';
import {
  SimpleAllocation,
  BN,
  Outcome,
  Zero,
  simpleEthAllocation,
  isSimpleEthAllocation,
  simpleTokenAllocation,
} from '@statechannels/wallet-core';

import {match} from '../match';

import {Protocol, ChannelState, stage, ProtocolResult} from './state';
import {protocol as fundingProtocol} from './depositing';

export type ProtocolState = ChannelState & {minimalOutcome: SimpleAllocation};

type FundingStatus = 'Funded' | 'Not Funded';

function minimalOutcome(
  currentOutcome: SimpleAllocation,
  minimalAllocation: SimpleAllocation
): Outcome {
  const allocationItems = currentOutcome.allocationItems.concat(
    minimalAllocation.allocationItems.map(({destination, amount}) => {
      const currentlyAllocated = currentOutcome.allocationItems
        .filter(i => i.destination === destination)
        .map(i => i.amount)
        .reduce(BN.add);

      const amountLeft = BN.gt(amount, currentlyAllocated)
        ? BN.sub(amount, currentlyAllocated)
        : Zero;
      return {destination, amount: amountLeft};
    })
  );

  return simpleTokenAllocation(minimalAllocation.assetHolderAddress, allocationItems);
}
const signState = (stage: 'PrefundSetup' | 'PostfundSetup') => async (
  state: ProtocolState
): ProtocolResult => {
  const currentOutcome =
    state.supported && isSimpleEthAllocation(state.supported.outcome)
      ? state.supported.outcome
      : simpleEthAllocation([]);
  return right(
    some({
      type: 'SignState',
      channelId: state.channelId,
      turnNum: stage === 'PrefundSetup' ? 0 : 1,
      outcome: minimalOutcome(currentOutcome, state.minimalOutcome),
    })
  );
};

const getFundingStatus = (ps: ProtocolState): FundingStatus => {
  const currentFunding = ps.funding[ps.minimalOutcome.assetHolderAddress] || '0x0';
  const targetFunding = ps.minimalOutcome.allocationItems.map(a => a.amount).reduce(BN.add);
  return BN.gte(currentFunding, targetFunding) ? 'Funded' : 'Not Funded';
};

const alreadyFunded = match(ps => stage(ps.latestSignedByMe), {
  Missing: () => Promise.resolve(left(new Error(`Missing prefund setup`))),
  PrefundSetup: signState('PostfundSetup'),
  PostfundSetup: () => Promise.resolve(right(none)), // Postfund setup is already signed
  Default: () => Promise.resolve(left(new Error(`State signed too early`))),
});

const prefundSetupStateSupported = match(getFundingStatus, {
  Funded: alreadyFunded,
  'Not Funded': async ps => fundingProtocol(ps),
});

const noSupportedState = match(ps => stage(ps.latestSignedByMe), {
  Missing: signState('PrefundSetup'),
  PrefundSetup: () => Promise.resolve(right(none)), // Could probably log something out
  Default: () => Promise.resolve(left(new Error(`State signed too early`))),
});

export const protocol: Protocol<ProtocolState> = match(ps => stage(ps.supported), {
  Missing: noSupportedState,
  PrefundSetup: prefundSetupStateSupported,

  Default: () => Promise.resolve(right(none)),
});
