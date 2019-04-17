import * as states from '../redux/state';
import React, { PureComponent } from 'react';
import LandingPage from '../components/landing-page';
import { connect } from 'react-redux';
import IndirectFundingContainer from '../redux/protocols/indirect-funding/container';

interface Props {
  state: states.Initialized;
}

class WalletInitializedContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    if (state.indirectFunding) {
      return <IndirectFundingContainer state={state.indirectFunding} />;
    } else {
      return <LandingPage />;
    } // Wallet is neither handling an active application channel process nor managing an indirect funding process.
  }
}

export default connect(() => ({}))(WalletInitializedContainer);
