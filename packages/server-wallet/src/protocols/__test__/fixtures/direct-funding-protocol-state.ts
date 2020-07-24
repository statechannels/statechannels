import _ from 'lodash';
import {StateVariables} from '@statechannels/wallet-core';

import {Fixture, FixtureProps} from '../../../wallet/__test__/fixtures/utils';
import {ProtocolState} from '../../direct-funding';
import {channel} from '../../../models/__test__/fixtures/channel';

export const directFundingProtocolState: Fixture<ProtocolState> = props => {
  const defaults = channel().protocolState;
  return {app: _.merge(defaults, props?.app)};
};

export const withSupportedState = (
  stateVars: Partial<StateVariables>,
  props?: FixtureProps<ProtocolState>
): FixtureProps<ProtocolState> => {
  return _.merge(props, {
    app: {
      latest: stateVars,
      supported: stateVars,
      latestSignedByMe: stateVars,
    },
  });
};
