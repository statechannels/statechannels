import * as states from '../redux/state';
import React, { PureComponent } from 'react';
import LandingPage from '../components/landing-page';
import { connect } from 'react-redux';

import { Funding } from '../redux/protocols/funding/container';
import * as selectors from '../redux/selectors';
import * as fundingStates from '../redux/protocols/funding/states';

interface Props {
  state: states.Initialized;
}

class WalletInitializedContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    if (!state.currentProcessId) {
      return <LandingPage />;
    } else {
      // TODO: This should probably be contained in a ProtocolContainer
      const protocolState = selectors.getProtocolState(state, state.currentProcessId);
      if (fundingStates.isFundingState(protocolState) && !fundingStates.isTerminal(protocolState)) {
        return <Funding state={protocolState} />;
      }
    }
    return <LandingPage />;
  }
}

export default connect(() => ({}))(WalletInitializedContainer);
