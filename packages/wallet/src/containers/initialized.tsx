import * as states from '../redux/state';
import React, { PureComponent } from 'react';
import LandingPage from '../components/landing-page';
import { connect } from 'react-redux';
import * as selectors from '../redux/selectors';
import { Protocol } from '../redux/protocols/container';

interface Props {
  state: states.Initialized;
}

class WalletInitializedContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    if (!state.currentProcessId) {
      return <LandingPage />;
    } else {
      const protocolState = selectors.getProtocolState(state, state.currentProcessId);
      return <Protocol protocolState={protocolState} />;
    }
    return <LandingPage />;
  }
}

export default connect(() => ({}))(WalletInitializedContainer);
