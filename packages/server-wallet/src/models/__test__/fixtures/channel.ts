import {StateVariables, calculateChannelId} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Channel, RequiredColumns} from '../../../models/channel';
import {Fixture, fixture, DeepPartial} from '../../../wallet/__test__/fixtures/utils';
import {addHash, dropNonVariables} from '../../../state-utils';
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
  };

  const columns: RequiredColumns = _.merge(defaults, props);

  columns.vars.map(s => (s = dropNonVariables(addHash({...columns, ...s}))));
  (columns as any).channelId = calculateChannelId(columns);
  return Channel.fromJson(columns);
};

export const channelWithVars: Fixture<Channel> = fixture<Channel>(
  channel({vars: [addHash(stateSignedBy()())]})
);

export const withSupportedState = (
  stateVars: Partial<StateVariables>,
  channelProps?: DeepPartial<RequiredColumns>,
  signingWallets?: SigningWallet[]
): Fixture<Channel> =>
  fixture(
    channel({
      vars: [
        addHash(
          stateSignedBy(...(signingWallets ? signingWallets : [alice(), bob()]))({...stateVars})
        ),
      ],
      ...channelProps,
    })
  );
