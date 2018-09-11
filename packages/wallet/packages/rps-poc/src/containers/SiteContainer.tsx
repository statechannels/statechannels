import React from 'react';

import '../App.css';
import Header from '../components/Header';
import ApplicationContainer from './ApplicationContainer';
import HomePageContainer from './HomePageContainer';
import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';
import MetamaskErrorPage from '../components/MetamaskErrorPage';
import { MetamaskError } from '../redux/metamask/actions';
import LoadingPage from '../components/LoadingPage';


interface SiteProps {
  isAuthenticated: boolean;
  metamaskError: MetamaskError | null;
  loading: boolean;
}

function Site(props: SiteProps) {
  let content;
  if (props.loading) {
    content =<LoadingPage/>;
  } else if (props.metamaskError !== null) {
    content = <MetamaskErrorPage error={props.metamaskError} />;
  } else if (props.isAuthenticated) {
    content = <ApplicationContainer />;
  } else {
    content = <HomePageContainer />;
  }

  return (
    <div>
      <header>
        <Header />
      </header>
      {content}
    </div>
  );
}

const mapStateToProps = (state: SiteState): SiteProps => {
  return {
    isAuthenticated: state.login && state.login.loggedIn,
    loading: state.metamask.loading,
    metamaskError: state.metamask.error,
  };
};

export default connect(mapStateToProps)(Site);
