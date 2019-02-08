import React from 'react';

import ApplicationContainer from './ApplicationContainer';
import HomePageContainer from './HomePageContainer';
import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';
import MetamaskErrorPage from '../components/MetamaskErrorPage';
import { MetamaskError } from '../redux/metamask/actions';
import LoadingPage from '../components/LoadingPage';
import { createWalletIFrame } from 'wallet-client';
import { WALLET_IFRAME_ID, WALLET_URL } from '../constants';
import LoginErrorPage from '../components/LoginErrorPage';
interface SiteProps {
  isAuthenticated: boolean;
  metamaskError: MetamaskError | null;
  loginError: string | undefined;
  loading: boolean;
  walletVisible: boolean;
}

class Site extends React.PureComponent<SiteProps>{
  walletDiv: React.RefObject<any>;
  constructor(props) {
    super(props);
    this.walletDiv = React.createRef();
  }
  componentDidMount() {
    const walletIframe = createWalletIFrame(WALLET_IFRAME_ID, WALLET_URL);
    this.walletDiv.current.appendChild(walletIframe);

  }
  render() {

    let component;
    if (this.props.loading) {
      component = <LoadingPage />;
    } else if (this.props.loginError) {
      component = <LoginErrorPage error={this.props.loginError} />;
    } else if (this.props.metamaskError !== null) {
      component = <MetamaskErrorPage error={this.props.metamaskError} />;
    } else if (this.props.isAuthenticated) {
      component = <ApplicationContainer />;
      const iFrame = document.getElementById(WALLET_IFRAME_ID) as HTMLIFrameElement;
      if (iFrame && this.props.walletVisible) {
        iFrame.style.display = 'initial';
        document.body.style.overflow = 'hidden';
        iFrame.width = '100%';
        iFrame.height = '100%';
      }
      else if (iFrame && !this.props.walletVisible) {
        iFrame.style.display = 'none';
        document.body.style.overflow = 'initial';
        iFrame.width = '0';
        iFrame.height = '0';
      }
    } else {
      component = <HomePageContainer />;
    }

    return <div className="w-100"><div ref={this.walletDiv} />{component}</div>;
  }
}

const mapStateToProps = (state: SiteState): SiteProps => {
  return {
    isAuthenticated: state.login && state.login.loggedIn,
    loading: state.metamask.loading,
    metamaskError: state.metamask.error,
    walletVisible: state.overlay.walletVisible,
    loginError: state.login.error,
  };
};

export default connect(mapStateToProps)(Site);
