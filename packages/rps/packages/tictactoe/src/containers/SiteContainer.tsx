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


interface SiteProps {
  isAuthenticated: boolean;
  metamaskError: MetamaskError | null;
  loading: boolean;
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
    } else if (this.props.metamaskError !== null) {
      component = <MetamaskErrorPage error={this.props.metamaskError} />;
    } else if (this.props.isAuthenticated) {
      component = <ApplicationContainer />;
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
  };
};

export default connect(mapStateToProps)(Site);
