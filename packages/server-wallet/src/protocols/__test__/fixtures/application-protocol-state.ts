import {StateVariables} from '@statechannels/wallet-core';

import {fixture, Fixture} from '../../../wallet/__test__/fixtures/utils';
import {
  channel,
  withSupportedState as channelWithSupportedState,
} from '../../../models/__test__/fixtures/channel';
import {ProtocolState} from '../../application';

export const applicationProtocolState = fixture({app: channel().protocolState});
export const withSupportedState = (stateVars: Partial<StateVariables>): Fixture<ProtocolState> =>
  fixture(
    applicationProtocolState({
      app: channelWithSupportedState(stateVars)().protocolState,
    })
  );
