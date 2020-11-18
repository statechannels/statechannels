import {calculateChannelId, SignedStateVarsWithHash} from '@statechannels/wallet-core';
import _ from 'lodash';
import {flow} from 'fp-ts/lib/function';

import {Channel, RequiredColumns} from '../../../models/channel';
import {Fixture, fixture, DeepPartial} from '../../../wallet/__test__/fixtures/utils';
import {addHash, dropNonVariables, addChannelId, addHashes} from '../../../state-utils';
import {alice, bob} from '../../../wallet/__test__/fixtures/signing-wallets';
import {createState, stateSignedBy} from '../../../wallet/__test__/fixtures/states';
import {SigningWallet} from '../../signing-wallet';

export const channel: Fixture<Channel> = (props?: DeepPartial<RequiredColumns>) => {
  const {appDefinition, chainId, challengeDuration, channelNonce, participants} = createState();

  const defaults: RequiredColumns = {
    appDefinition,
    channelNonce,
    chainId,
    challengeDuration,
    participants,
    signingAddress: alice().address,
    vars: [],
    chainServiceRequests: [],
    fundingStrategy: 'Direct',
  };

  const columns: RequiredColumns = _.merge(defaults, props);

  columns.vars.map(s => (s = dropNonVariables(addHash({...columns, ...s}))));
  (columns as any).channelId = calculateChannelId(columns);
  const channel = Channel.fromJson({...columns});

  return channel;
};

export const channelWithVars: Fixture<Channel> = fixture<Channel>(
  channel({vars: [addHash(stateSignedBy()())]})
);

const signVars = (signingWallets: SigningWallet[]) => (channel: Channel): Channel => {
  const {channelConstants, vars} = channel;
  vars.map(
    state =>
      (state.signatures = signingWallets.map(sw => sw.signState({...channelConstants, ...state})))
  );

  return channel;
};

function overwriteVars(result: Channel, props?: {vars: SignedStateVarsWithHash[]}): Channel {
  if (props?.vars) result.vars = props.vars;

  return result;
}

export const withSupportedState = (
  signingWallets: SigningWallet[] = [alice(), bob()]
): Fixture<Channel> =>
  fixture(
    channel({signingWallet: signingWallets.length > 0 ? signingWallets[0] : undefined}),
    flow(overwriteVars, addHashes, signVars(signingWallets), addChannelId)
  );
