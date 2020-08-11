import {StateVariables} from '@statechannels/wallet-core';

import {fixture, Fixture} from '../../../wallet/__test__/fixtures/utils';
import {
  channel,
  withSupportedState as channelWithSupportedState,
} from '../../../models/__test__/fixtures/channel';
import {ProtocolState} from '../../application';
import {stateVars} from '../../../wallet/__test__/fixtures/state-vars';

export const applicationProtocolState = fixture({app: channel().protocolState});
export const withSupportedState = (vars: Partial<StateVariables>): Fixture<ProtocolState> =>
  fixture(
    applicationProtocolState({
      app: channelWithSupportedState()({vars: [stateVars(vars)]}).protocolState,
    })
  );
