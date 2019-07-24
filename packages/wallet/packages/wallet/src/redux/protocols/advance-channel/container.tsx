import * as states from './states';
import { PureComponent } from 'react';

import React from 'react';
import { connect } from 'react-redux';
import AdvancingChannel from './components/advancing-channel';

interface Props {
  state: states.AdvanceChannelState;
}

class AdvanceChannelContainer extends PureComponent<Props> {
  render() {
    return <AdvancingChannel />;
  }
}

export const AdvanceChannel = connect(
  () => ({}),
  () => ({}),
)(AdvanceChannelContainer);
