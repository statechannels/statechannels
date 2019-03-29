import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../redux/state';
import InitializingContainer from './Initializing';
import WalletInitializedContainer from './Initialized';
import LandingPage from '../components/LandingPage';

interface WalletProps {
  state: states.WalletState;
}

class WalletContainer extends PureComponent<WalletProps> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case states.WAIT_FOR_LOGIN:
      case states.METAMASK_ERROR:
      case states.WAIT_FOR_ADJUDICATOR:
        return <InitializingContainer state={state} />;
      case states.WALLET_INITIALIZED:
        return <WalletInitializedContainer state={state} />;
      default:
        return <LandingPage />;
    }
  }
}

const mapStateToProps = (state: states.WalletState): WalletProps => ({
  state,
});

export default connect(mapStateToProps)(WalletContainer);
