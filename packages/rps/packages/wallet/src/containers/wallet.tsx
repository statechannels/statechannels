import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../redux/state';
import InitializingContainer from './initializing';
import WalletInitializedContainer from './initialized';
import LandingPage from '../components/landing-page';
import Modal from 'react-modal';

interface WalletProps {
  state: states.WalletState;
  position: 'left' | 'center' | 'right';
}

class WalletContainer extends PureComponent<WalletProps> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case states.WAIT_FOR_LOGIN:
      case states.METAMASK_ERROR:
      case states.WAIT_FOR_ADJUDICATOR:
        return (
          <Modal
            isOpen={true}
            className={'wallet-content-' + this.props.position}
            overlayClassName={'wallet-overlay-' + this.props.position}
            ariaHideApp={false}
          >
            <InitializingContainer state={state} />
          </Modal>
        );
      case states.WALLET_INITIALIZED:
        return (
          <Modal
            isOpen={true}
            className={'wallet-content-' + this.props.position}
            overlayClassName={'wallet-overlay-' + this.props.position}
            ariaHideApp={false}
          >
            <WalletInitializedContainer state={state} />
          </Modal>
        );
      default:
        return <LandingPage />;
    }
  }
}

const mapStateToProps = (state: states.WalletState, ownProps?): WalletProps => ({
  state,
  position: ownProps.position,
});

export default connect(mapStateToProps)(WalletContainer);
