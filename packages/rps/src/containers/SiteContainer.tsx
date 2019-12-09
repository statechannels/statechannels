import React from 'react';

import ApplicationContainer from './ApplicationContainer';
import HomePageContainer from './HomePageContainer';
import {connect} from 'react-redux';

import {SiteState} from '../redux/reducer';
import MetamaskErrorPage from '../components/MetamaskErrorPage';
import {MetamaskError} from '../redux/metamask/actions';
import LoadingPage from '../components/LoadingPage';

import LoginErrorPage from '../components/LoginErrorPage';
import * as actions from '../redux/login/actions';
interface SiteProps {
  isAuthenticated: boolean;
  metamaskError: MetamaskError | null;
  loginError: string | undefined;
  loading: boolean;
  walletVisible: boolean;
  walletIFrameLoaded: () => void;
}

class Site extends React.PureComponent<SiteProps> {
  walletDiv: React.RefObject<any>;
  constructor(props) {
    super(props);
    this.walletDiv = React.createRef();
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
    } else {
      component = <HomePageContainer />;
    }

    return (
      <div className="w-100">
        <div ref={this.walletDiv} />
        {component}
      </div>
    );
  }
}

const mapStateToProps = (state: SiteState) => {
  return {
    isAuthenticated: state.login && state.login.loggedIn,
    loading: state.metamask.loading,
    metamaskError: state.metamask.error,
    walletVisible: state.overlay.walletVisible,
    loginError: state.login.error,
  };
};
const mapDispatchToProps = {
  walletIFrameLoaded: actions.walletIframeLoaded,
};
export default connect(mapStateToProps, mapDispatchToProps)(Site);
