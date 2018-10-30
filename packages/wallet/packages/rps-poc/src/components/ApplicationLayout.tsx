import React from 'react';
import NavigationBarContainer from "../containers/NavigationBarContainer";

import MAGMO_LOGO from '../images/magmo_logo.svg';

export const ApplicationLayout = (props) => {
  return (
    <div className="w-100">
      <NavigationBarContainer />

      <div className="container centered-container w-100">
        {props.children}
      </div>


      <nav className="navbar fixed-bottom navbar-light footer-bar">

        <div className="container">
          <div className="ml-auto">
            <div className="footer-logo-container">
              <img src={MAGMO_LOGO} />
              <small className="text-muted">
                Something not working? Email us at <a href="oops@magmo.com">oops@magmo.com</a>
              </small>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};
