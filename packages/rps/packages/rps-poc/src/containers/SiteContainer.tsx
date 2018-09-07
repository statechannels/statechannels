import React from 'react';

import '../App.css';
import Header from '../components/Header';
import ApplicationContainer from './ApplicationContainer';
import HomePageContainer from './HomePageContainer';
import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';

interface SiteProps {
  isAuthenticated: boolean;
}

function Site(props: SiteProps) {
  let content;
  if (props.isAuthenticated) {
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
};

const mapStateToProps = (state: SiteState): SiteProps => {
  return {
    isAuthenticated: state.login && state.login.loggedIn,
  };
};

export default connect(mapStateToProps)(Site);

