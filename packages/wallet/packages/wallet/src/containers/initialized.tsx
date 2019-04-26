import * as states from '../redux/state';
import React, { PureComponent } from 'react';
import LandingPage from '../components/landing-page';
import { connect } from 'react-redux';

interface Props {
  state: states.Initialized;
}

class WalletInitializedContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    if (!state.currentProcessId) {
      return <LandingPage />;
    } else {
      // todo: show protocol container
    }
    return <LandingPage />;
  }
}

export default connect(() => ({}))(WalletInitializedContainer);
