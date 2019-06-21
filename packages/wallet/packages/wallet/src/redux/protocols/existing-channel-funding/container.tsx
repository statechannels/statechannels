import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';

interface Props {
  state: states.ExistingChannelFundingState;
}

class ExistingChannelFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    return <div>{state.type}</div>;
  }
}

export const ExistingChannelFunding = connect(() => ({}))(ExistingChannelFundingContainer);
