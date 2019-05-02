import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../redux/state';
import MetamaskErrorContainer from './metamask-error';
import WalletInitializedContainer from './initialized';
import LandingPage from '../components/landing-page';
import Modal from 'react-modal';
import StatusBarLayout from '../components/status-bar-layout';

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
        return (
          <Modal
            isOpen={true}
            className={'wallet-content-' + this.props.position}
            overlayClassName={'wallet-overlay-' + this.props.position}
            ariaHideApp={false}
          >
            <StatusBarLayout>
              <MetamaskErrorContainer state={state} />
            </StatusBarLayout>
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
            <StatusBarLayout>
              <WalletInitializedContainer state={state} />
            </StatusBarLayout>
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
