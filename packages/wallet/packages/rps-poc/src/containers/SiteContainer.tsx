import React from 'react';

import ApplicationContainer from './ApplicationContainer';
import HomePageContainer from './HomePageContainer';
import ProfileContainer from './ProfileContainer';
import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';
import MetamaskErrorPage from '../components/MetamaskErrorPage';
import { MetamaskError } from '../redux/metamask/actions';
import LoadingPage from '../components/LoadingPage';

interface SiteProps {
  isAuthenticated: boolean;
  metamaskError: MetamaskError | null;
  loading: boolean;
  hasProfile: boolean;
}

function Site(props: SiteProps) {
  if (props.loading) {
    return <LoadingPage />;
  } else if (props.metamaskError !== null) {
    return <MetamaskErrorPage error={props.metamaskError} />;
  } else if (props.isAuthenticated) {
    if (props.hasProfile) {
      return <ApplicationContainer />;
    } else {
      return <ProfileContainer />;
    }
  } else {
    return <HomePageContainer />;
  }
}

const mapStateToProps = (state: SiteState): SiteProps => {
  return {
    isAuthenticated: state.login && state.login.loggedIn,
    loading: state.metamask.loading,
    metamaskError: state.metamask.error,
    hasProfile: state.login && !!state.login.profile && !!state.login.profile.name,
  };
};

export default connect(mapStateToProps)(Site);
