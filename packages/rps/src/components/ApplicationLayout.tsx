import React from 'react';
import NavigationBarContainer from '../containers/NavigationBarContainer';

import PROJECT_LOGO from '../images/horizontal_logo.svg';

export const ApplicationLayout = props => {
  return (
    <div className="w-100">
      <NavigationBarContainer />

      <div className="container centered-container w-100 mb-5">{props.children}</div>

      <nav className="navbar fixed-bottom navbar-light footer-bar">
        <div className="container">
          <div className="ml-auto">
            <div className="footer-logo-container">
              <img src={PROJECT_LOGO} width="150" />
              <small className="text-muted">
                Something not working? Email us at{' '}
                <a href="mailto:oops@statechannels.org">oops@statechannels.org</a>
              </small>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};
