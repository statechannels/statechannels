import React from 'react';

import ApplicationContainer from './ApplicationContainer';
import HomePageContainer from './HomePageContainer';
import {connect} from 'react-redux';

import {SiteState} from '../redux/reducer';
import MetamaskErrorPage from '../components/MetamaskErrorPage';
import {MetamaskError} from '../redux/metamask/actions';
import {WalletError} from '../redux/wallet/actions';
import LoadingPage from '../components/LoadingPage';
import ConnectionBanner from '@rimble/connection-banner';

import LoginErrorPage from '../components/LoginErrorPage';
interface SiteProps {
  isAuthenticated: boolean;
  metamaskError: MetamaskError | null;
  walletError: WalletError | null;
  loginError: string | undefined;
  loading: boolean;
}

class Site extends React.PureComponent<SiteProps> {
  walletDiv: React.RefObject<any>;
  constructor(props) {
    super(props);
    this.walletDiv = React.createRef();
  }

  render() {
    let component;

    let currentNetwork;
    if (window.ethereum) {
      currentNetwork = parseInt(window.ethereum.networkVersion, 10);
    } else {
      currentNetwork = undefined;
    }

    if (this.props.loading) {
      component = <LoadingPage />;
    } else if (this.props.loginError) {
      component = <LoginErrorPage error={this.props.loginError} />;
    } else if (this.props.metamaskError !== null) {
      component = <MetamaskErrorPage error={this.props.metamaskError} />;
    } else if (this.props.walletError !== null) {
      component = <code>{JSON.stringify(this.props.walletError, null, 2)}</code>;
    } else if (this.props.isAuthenticated) {
      component = <ApplicationContainer />;
    } else {
      component = <HomePageContainer />;
    }

    return (
      <div className="w-100">
        <div ref={this.walletDiv} />
        {component}
        <ConnectionBanner
          currentNetwork={currentNetwork}
          requiredNetwork={process.env.CHAIN_NETWORK_ID}
          onWeb3Fallback={false}
        />
      </div>
    );
  }
}

const mapStateToProps = (state: SiteState) => {
  return {
    isAuthenticated: state.login && state.login.loggedIn,
    loading: state.metamask.loading,
    metamaskError: state.metamask.error,
    walletError: state.wallet.error,
    walletVisible: state.overlay.walletVisible,
    loginError: state.login.error,
  };
};

export default connect(mapStateToProps)(Site);
